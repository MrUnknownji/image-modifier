'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { ImagePlus, Sparkles, Shield, Zap, Image as ImageIcon, Check, Lock, Cpu, Layers, Palette, Wand2, FileImage, HardDrive, Globe, Sun, Moon } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageUploader } from '@/components/image-modifier/image-uploader';
import { ImageSettingsPanel } from '@/components/image-modifier/image-settings-panel';
import { ImagePreview } from '@/components/image-modifier/image-preview';
import { BatchProcessor } from '@/components/image-modifier/batch-processor';
import {
  createProcessedImage,
  processImage,
  sanitizeBaseName,
  validateImageFile,
} from '@/lib/image-processing';
import { MAX_IMAGE_COUNT, type ProcessedImage, type ImageSettings } from '@/types/image';

// Error boundary component for the whole app
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4 text-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="mt-2 text-muted-foreground">Please refresh the page to try again.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ImageModifierApp() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('modify');
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const { theme, setTheme } = useTheme();
  const abortControllerRef = useRef<AbortController | null>(null);
  const imageUrlsRef = useRef<Map<string, string>>(new Map());

  const selectedImage = images.find((img) => img.id === selectedId) || null;
  const openFilePicker = useCallback(() => {
    document.getElementById('file-input')?.click();
  }, []);

  const handleImagesAdd = useCallback(async (files: FileList | File[]) => {
    const availableSlots = Math.max(0, MAX_IMAGE_COUNT - images.length);
    if (availableSlots === 0) {
      toast.error(`You can work with up to ${MAX_IMAGE_COUNT} images at a time.`);
      return;
    }

    const candidates = Array.from(files).slice(0, availableSlots);
    const newImages: ProcessedImage[] = [];
    const validationErrors: string[] = [];

    for (const file of candidates) {
      const validationError = validateImageFile(file);
      if (validationError) {
        validationErrors.push(validationError);
        continue;
      }

      try {
        const processedImage = await createProcessedImage(file);
        imageUrlsRef.current.set(processedImage.id, processedImage.originalUrl);
        newImages.push(processedImage);
      } catch (error) {
        validationErrors.push(
          error instanceof Error ? error.message : `Could not read ${file.name}.`
        );
      }
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
      setBatchSelectedIds((prev) => [
        ...new Set([...prev, ...newImages.map((image) => image.id)]),
      ]);
      setSelectedId((current) => current ?? newImages[0].id);
      toast.success(
        `${newImages.length} image${newImages.length === 1 ? '' : 's'} ready to edit`
      );
    }

    if (files.length > candidates.length) {
      validationErrors.push(
        `Only the first ${availableSlots} image${availableSlots === 1 ? '' : 's'} were added (limit ${MAX_IMAGE_COUNT}).`
      );
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0], {
        description:
          validationErrors.length > 1
            ? `${validationErrors.length - 1} more file${validationErrors.length === 2 ? '' : 's'} were skipped.`
            : undefined,
      });
    }
  }, [images.length]);

  const handleImageRemove = useCallback((id: string) => {
    const nextSelectedId = images.find((image) => image.id !== id)?.id ?? null;
    setImages((prev) => {
      const img = prev.find(i => i.id === id);
      if (img?.originalUrl) {
        URL.revokeObjectURL(img.originalUrl);
        imageUrlsRef.current.delete(id);
      }
      return prev.filter((i) => i.id !== id);
    });
    if (selectedId === id) {
      setSelectedId(nextSelectedId);
      setProcessedBlob(null);
    }
    setBatchSelectedIds((prev) => prev.filter((imageId) => imageId !== id));
  }, [images, selectedId]);

  const handleImagesClear = useCallback(() => {
    imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    imageUrlsRef.current.clear();
    setImages([]);
    setBatchSelectedIds([]);
    setSelectedId(null);
    setProcessedBlob(null);
  }, []);

  const handleSettingsChange = useCallback((settings: ImageSettings) => {
    if (!selectedId) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === selectedId ? { ...img, settings } : img
      )
    );
  }, [selectedId]);

  const handleApplySettings = useCallback((scope: 'chosen' | 'all') => {
    if (!selectedImage) return;
    const chosenIds = new Set(batchSelectedIds);
    const affectedCount =
      scope === 'all'
        ? images.length
        : images.filter((image) => chosenIds.has(image.id)).length;

    if (affectedCount === 0) {
      toast.error('Choose at least one batch image first.');
      return;
    }

    setImages((prev) =>
      prev.map((img) => {
        const shouldApply = scope === 'all' || chosenIds.has(img.id);
        return shouldApply
          ? {
              ...img,
              settings: {
                ...selectedImage.settings,
                filters: { ...selectedImage.settings.filters },
              },
            }
          : img;
      })
    );
    toast.success(
      `Settings copied to ${affectedCount} image${affectedCount === 1 ? '' : 's'}`,
      {
        description:
          scope === 'all'
            ? 'The entire batch now uses the current image settings.'
            : 'Only your chosen batch images were updated.',
      }
    );
  }, [batchSelectedIds, images, selectedImage]);

  const handleDownload = useCallback(async () => {
    if (!processedBlob || !selectedImage) return;
    
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeBaseName(selectedImage.metadata.name)}-edited.${selectedImage.settings.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Image downloaded successfully');
  }, [processedBlob, selectedImage]);

  // Process selected image whenever settings change
  useEffect(() => {
    if (!selectedImage) {
      return;
    }

    const processSelected = async () => {
      // Abort previous processing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const currentController = new AbortController();
      abortControllerRef.current = currentController;

      setIsProcessing(true);
      try {
        const blob = await processImage(selectedImage, null, currentController.signal);
        if (!currentController.signal.aborted) {
          setProcessedBlob(blob);
        }
      } catch (error) {
        if ((error as Error).message !== 'Processing aborted' && !currentController.signal.aborted) {
          console.error('Failed to process image:', error);
          setProcessedBlob(null);
          toast.error('This image could not be processed', {
            id: 'processing-error',
            description: error instanceof Error ? error.message : 'Try a smaller output size.',
          });
        }
      } finally {
        if (!currentController.signal.aborted) {
          setIsProcessing(false);
        }
      }
    };

    const timeoutId = setTimeout(processSelected, 150);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key.toLowerCase() === 's' && processedBlob) {
        e.preventDefault();
        handleDownload();
      } else if (e.key === 'Delete') {
        if (selectedId && document.activeElement === document.body) {
          e.preventDefault();
          handleImageRemove(selectedId);
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName) ||
          activeElement.isContentEditable)
      ) {
        return;
      }
      
      const items = e.clipboardData?.items;
      if (items) {
        const files: File[] = [];
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
        if (files.length > 0) {
          const dataTransfer = new DataTransfer();
          files.forEach(f => dataTransfer.items.add(f));
          await handleImagesAdd(dataTransfer.files);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handlePaste);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleDownload, handleImageRemove, handleImagesAdd, processedBlob, selectedId]);

  // Revoke all remaining blob URLs only when the component unmounts
  useEffect(() => {
    const trackedUrls = imageUrlsRef.current;
    return () => {
      trackedUrls.forEach((url) => URL.revokeObjectURL(url));
      trackedUrls.clear();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md"
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo size={32} className="text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">AuraEdit</h1>
              <p className="text-xs text-muted-foreground font-medium">
                Resize, convert, and optimize your images
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setShowFeaturesDialog(true)} className="gap-2 text-xs font-bold uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5" />
                Features
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPrivacyDialog(true)} className="gap-2 text-xs font-bold uppercase tracking-wider">
                <Shield className="h-3.5 w-3.5" />
                Privacy
              </Button>
            </nav>
            <div className="h-6 w-px bg-border/50 mx-2 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 rounded-full"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle color theme"
              >
                <Sun className="hidden h-4 w-4 dark:block" aria-hidden="true" />
                <Moon className="block h-4 w-4 dark:hidden" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[296px_minmax(0,1fr)] lg:gap-6">
          {/* Sidebar */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="flex flex-col gap-4 lg:sticky lg:top-24"
          >
            <Card className="shadow-sm border-border/50 overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-primary" />
                  Upload Images
                </CardTitle>
                <CardDescription className="text-xs">
                  Select or drag and drop images to start editing
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ImageUploader
                  images={images}
                  selectedId={selectedId}
                  onImagesAdd={handleImagesAdd}
                  onImageSelect={setSelectedId}
                  onImageRemove={handleImageRemove}
                  onImagesClear={handleImagesClear}
                />
              </CardContent>
            </Card>

            <Card className="hidden border-border/50 shadow-sm lg:flex">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-none space-y-3 p-0 text-xs font-medium text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">1</span>
                    Upload your image(s)
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">2</span>
                    Adjust settings
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">3</span>
                    Download your result
                  </li>
                </ol>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.main 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="min-w-0"
          >
            <Tabs defaultValue="modify" className="w-full" onValueChange={setActiveTab}>
              <div className="mb-5 flex flex-col gap-3 border-b border-border/70 sm:flex-row sm:items-end sm:justify-between">
                <TabsList className="border-0">
                <TabsTrigger value="modify" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Modify Images
                </TabsTrigger>
                <TabsTrigger value="batch" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Batch Process
                </TabsTrigger>
                </TabsList>
                <div className="hidden items-center gap-2 whitespace-nowrap pb-3 text-xs font-medium text-muted-foreground sm:flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                  Local processing
                </div>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabsContent value="modify" className="mt-0">
                    <div className={`grid grid-cols-1 gap-5 ${selectedImage ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
                      <div className="min-w-0">
                        <ImagePreview
                          image={selectedImage}
                          processedBlob={processedBlob}
                          isProcessing={isProcessing}
                          onDownload={handleDownload}
                        />
                      </div>
                      {selectedImage && <div className="min-w-0">
                        <ImageSettingsPanel
                          key={selectedImage.id}
                          image={selectedImage}
                          onSettingsChange={handleSettingsChange}
                          onApplySettings={handleApplySettings}
                          hasMultipleImages={images.length > 1}
                          batchSelectedCount={batchSelectedIds.length}
                          totalImages={images.length}
                        />
                      </div>}
                    </div>
                  </TabsContent>

                  <TabsContent value="batch" className="mt-0">
                    <BatchProcessor 
                      images={images} 
                      globalSettings={selectedImage?.settings || images[0]?.settings || {
                        format: 'webp',
                        quality: 80,
                        width: 1920,
                        height: 1080,
                        maintainAspectRatio: true,
                        preserveMetadata: false,
                        dpi: 72,
                        rotation: 0,
                        flipHorizontal: false,
                        flipVertical: false,
                        filters: {
                          brightness: 100,
                          contrast: 100,
                          saturation: 100,
                          grayscale: 0,
                          sepia: 0,
                          blur: 0,
                          hueRotate: 0,
                        },
                      }}
                      aspectRatio={null}
                      onRequestUpload={openFilePicker}
                      activeImageId={selectedId}
                      batchSelectedIds={batchSelectedIds}
                      onBatchSelectionChange={setBatchSelectedIds}
                    />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </motion.main>
        </div>
      </div>

      <footer className="mt-5 w-full border-t border-border/60 bg-muted/15">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Files stay on this device
            </span>
            <span className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              No upload wait
            </span>
            <span className="flex items-center gap-2">
              <FileImage className="h-3.5 w-3.5 text-primary" />
              You control export metadata
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AuraEdit
          </p>
        </div>
      </footer>

      <Dialog open={showFeaturesDialog} onOpenChange={setShowFeaturesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Features
            </DialogTitle>
            <DialogDescription>
              Powerful image processing tools at your fingertips
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Cpu className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Fast Processing</h4>
                <p className="text-xs text-muted-foreground mt-0.5">All image processing happens locally in your browser using Canvas API for maximum speed.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Batch Processing</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Process multiple images at once with shared settings and download as a ZIP file.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Filters & Effects</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Adjust brightness, contrast, saturation, and more. Apply preset filters for quick edits.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Wand2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Format Conversion</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Convert between JPEG, PNG, and WebP formats with adjustable quality settings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FileImage className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Resize & Transform</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Resize to custom dimensions or preset resolutions. Rotate and flip images easily.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy & Security
            </DialogTitle>
            <DialogDescription>
              Your data stays with you, always
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                <Lock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400">100% Client-Side Processing</h4>
                <p className="text-xs text-muted-foreground mt-0.5">All image processing happens directly in your browser. Your images never leave your device.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <HardDrive className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">No Server Uploads</h4>
                <p className="text-xs text-muted-foreground mt-0.5">We don&apos;t have servers to store your images. Everything stays on your computer.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">No Tracking</h4>
                <p className="text-xs text-muted-foreground mt-0.5">No analytics, no cookies tracking your usage, no third-party scripts collecting your data.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FileImage className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Metadata control</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Metadata removal is enabled by default. You can optionally preserve available EXIF for JPEG-to-JPEG exports.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mt-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Open source and fully transparent</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <ImageModifierApp />
    </ErrorBoundary>
  );
}
