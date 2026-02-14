'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ImagePlus, Sparkles, Shield, Zap, Image as ImageIcon, Undo2, Redo2, Check, Lock, Cpu, Layers, Palette, Wand2, FileImage, HardDrive, Globe } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Logo, LogoSmall } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ErrorBoundary } from '@/components/error-boundary';
import { ImageUploader } from '@/components/image-modifier/image-uploader';
import { ImageSettingsPanel } from '@/components/image-modifier/image-settings-panel';
import { ImagePreview } from '@/components/image-modifier/image-preview';
import { BatchProcessor } from '@/components/image-modifier/batch-processor';
import {
  createProcessedImage,
  processImage,
  downloadImage,
} from '@/lib/image-processing';

import type {
  ProcessedImage,
  ImageSettings,
} from '@/types/image';

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_DIMENSION = 16384;

function ImageModifierApp() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio] = useState<number | null>(null);
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedImage = images.find((img) => img.id === selectedId) || null;

  const canUndo = selectedImage && selectedImage.historyIndex > 0;
  const canRedo = selectedImage && selectedImage.historyIndex < selectedImage.history.length - 1;

  const addHistoryEntry = useCallback((imageId: string, settings: ImageSettings, action: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== imageId) return img;
        
        const newHistory = img.history.slice(0, img.historyIndex + 1);
        newHistory.push({ settings: { ...settings }, timestamp: Date.now(), action });
        
        return {
          ...img,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      })
    );
  }, []);

  const handleUndo = useCallback(() => {
    if (!selectedImage || !canUndo) return;
    
    const newIndex = selectedImage.historyIndex - 1;
    const historicalSettings = selectedImage.history[newIndex].settings;
    
    setImages((prev) =>
      prev.map((img) =>
        img.id === selectedId ? { ...img, settings: historicalSettings, historyIndex: newIndex } : img
      )
    );
    toast.success('Undone');
  }, [selectedImage, selectedId, canUndo]);

  const handleRedo = useCallback(() => {
    if (!selectedImage || !canRedo) return;
    
    const newIndex = selectedImage.historyIndex + 1;
    const historicalSettings = selectedImage.history[newIndex].settings;
    
    setImages((prev) =>
      prev.map((img) =>
        img.id === selectedId ? { ...img, settings: historicalSettings, historyIndex: newIndex } : img
      )
    );
    toast.success('Redone');
  }, [selectedImage, selectedId, canRedo]);

  const handleImagesAdd = useCallback(
    async (files: FileList) => {
      const newImages: ProcessedImage[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`Skipped ${file.name}: Not an image file`);
          continue;
        }
        
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Skipped ${file.name}: File too large (max 100MB)`);
          continue;
        }
        
        try {
          const processedImage = await createProcessedImage(file);
          
          if (processedImage.dimensions.width > MAX_DIMENSION || processedImage.dimensions.height > MAX_DIMENSION) {
            toast.warning(`${file.name}: Very large image may cause performance issues`);
          }
          
          newImages.push(processedImage);
        } catch (error) {
          console.error('Failed to process image:', error);
          toast.error(`Failed to load ${file.name}`);
        }
      }

      if (newImages.length > 0) {
        setImages((prev) => [...prev, ...newImages]);
        toast.success(`Added ${newImages.length} image(s)`);
        
        if (!selectedId) {
          setSelectedId(newImages[0].id);
        }
      }
    },
    [selectedId]
  );

  const handleImageRemove = useCallback((id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove?.originalUrl) {
        URL.revokeObjectURL(imageToRemove.originalUrl);
      }
      
      const newImages = prev.filter((img) => img.id !== id);
      if (id === selectedId) {
        setSelectedId(newImages.length > 0 ? newImages[0].id : null);
      }
      return newImages;
    });
    setProcessedBlob(null);
    toast.success('Image removed');
  }, [selectedId]);

  const handleSettingsChange = useCallback(
    async (settings: ImageSettings) => {
      if (!selectedImage || !selectedId) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setImages((prev) =>
        prev.map((img) =>
          img.id === selectedId ? { ...img, settings } : img
        )
      );

      setIsProcessing(true);
      try {
        const updatedImage = { ...selectedImage, settings };
        const blob = await processImage(updatedImage, aspectRatio, abortControllerRef.current.signal);
        
        if (!abortControllerRef.current.signal.aborted) {
          setProcessedBlob(blob);
          addHistoryEntry(selectedId, settings, 'Settings changed');
        }
      } catch (error) {
        if ((error as Error).message !== 'Processing aborted' && !abortControllerRef.current.signal.aborted) {
          console.error('Failed to process image:', error);
          toast.error('Failed to process image');
        }
      } finally {
        if (!abortControllerRef.current.signal.aborted) {
          setIsProcessing(false);
        }
      }
    },
    [selectedImage, selectedId, aspectRatio, addHistoryEntry]
  );

  const handleApplyToAll = useCallback(() => {
    if (!selectedImage) return;
    
    setImages((prev) =>
      prev.map((img) =>
        img.id === selectedId
          ? img
          : { ...img, settings: { ...selectedImage.settings } }
      )
    );
    toast.success('Applied settings to all images');
  }, [selectedImage, selectedId]);

  const handleDownload = useCallback(() => {
    if (!processedBlob || !selectedImage) return;
    
    const url = URL.createObjectURL(processedBlob);
    const extension = selectedImage.settings.format;
    const baseName = selectedImage.metadata.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_processed.${extension}`;
    
    downloadImage(url, newName);
    URL.revokeObjectURL(url);
    toast.success('Image downloaded');
  }, [processedBlob, selectedImage]);

  useEffect(() => {
    const processSelected = async () => {
      if (!selectedImage) {
        setProcessedBlob(null);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;

      setIsProcessing(true);
      try {
        const blob = await processImage(selectedImage, aspectRatio, currentController.signal);
        if (!currentController.signal.aborted) {
          setProcessedBlob(blob);
        }
      } catch (error) {
        if ((error as Error).message !== 'Processing aborted' && !currentController.signal.aborted) {
          console.error('Failed to process image:', error);
          setProcessedBlob(null);
        }
      } finally {
        if (!currentController.signal.aborted) {
          setIsProcessing(false);
        }
      }
    };

    processSelected();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedImage?.id, aspectRatio]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (isCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      } else if (isCtrl && e.key === 's') {
        e.preventDefault();
        handleDownload();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          handleImageRemove(selectedId);
        }
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      
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
          toast.success('Image pasted from clipboard');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handlePaste);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('paste', handlePaste);
    };
  }, [handleUndo, handleRedo, handleDownload, handleImageRemove, handleImagesAdd, selectedId]);

  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.originalUrl) {
          URL.revokeObjectURL(img.originalUrl);
        }
      });
    };
  }, []);

  // Prevent page scroll when scrolling on number inputs
  useEffect(() => {
    let focusedInput: HTMLInputElement | null = null;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.getAttribute('type') === 'number') {
        focusedInput = target as HTMLInputElement;
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target === focusedInput) {
        focusedInput = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && target.getAttribute('type') === 'number' && target === focusedInput) {
        e.preventDefault();
        
        const input = target as HTMLInputElement;
        const step = parseFloat(input.step) || 1;
        const currentValue = parseFloat(input.value) || 0;
        const delta = e.deltaY > 0 ? -step : step;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const hasMin = !isNaN(min);
        const hasMax = !isNaN(max);
        let newValue = currentValue + delta;
        if (hasMin) newValue = Math.max(min, newValue);
        if (hasMax) newValue = Math.min(max, newValue);
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set;
        nativeInputValueSetter!.call(input, newValue.toString());
        
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);
      }
    };

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="bottom-right" richColors closeButton />
      
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
        <div className="px-4 py-4 w-full max-w-[100vw] box-border">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Logo size={40} />
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Image Modifier</h1>
                <p className="text-xs text-muted-foreground">
                  Resize, convert, and optimize your images
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {canUndo && (
                <Button variant="ghost" size="icon" onClick={handleUndo} className="h-8 w-8" title="Undo (Ctrl+Z)">
                  <Undo2 className="h-4 w-4" />
                </Button>
              )}
              {canRedo && (
                <Button variant="ghost" size="icon" onClick={handleRedo} className="h-8 w-8" title="Redo (Ctrl+Y)">
                  <Redo2 className="h-4 w-4" />
                </Button>
              )}
              <div className="hidden sm:flex items-center gap-1 ml-2">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => setShowFeaturesDialog(true)}>
                  <Zap className="h-4 w-4" />
                  Features
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={() => setShowPrivacyDialog(true)}>
                  <Shield className="h-4 w-4" />
                  Privacy
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 w-full max-w-[100vw] box-border overflow-x-hidden">
        <Tabs defaultValue="modify" className="space-y-4 w-full max-w-full">
          <div className="flex justify-center w-full px-0">
            <TabsList className="grid w-full grid-cols-2 max-w-full">
              <TabsTrigger value="modify" className="gap-2">
                <ImagePlus className="h-4 w-4" />
                Modify Images
              </TabsTrigger>
              <TabsTrigger value="batch" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Batch Process
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="modify" className="space-y-4 w-full max-w-full px-0">
            <div className="flex flex-col lg:grid lg:grid-cols-[380px_1fr] gap-4 lg:gap-6 w-full max-w-full">
              <div className="space-y-4 w-full max-w-full">
                <Card className="overflow-hidden w-full max-w-full">
                  <CardHeader className="pb-4 px-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Images
                    </CardTitle>
                    <CardDescription>
                      Upload and manage your images
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4">
                    <ImageUploader
                      images={images}
                      onImagesAdd={handleImagesAdd}
                      onImageRemove={handleImageRemove}
                      onImageSelect={setSelectedId}
                      selectedId={selectedId}
                    />
                  </CardContent>
                </Card>

                <ImageSettingsPanel
                  image={selectedImage}
                  onSettingsChange={handleSettingsChange}
                  onApplyToAll={handleApplyToAll}
                  hasMultipleImages={images.length > 1}
                />
              </div>

              <div className="space-y-4 w-full">
                <ImagePreview
                  image={selectedImage}
                  processedBlob={processedBlob}
                  isProcessing={isProcessing}
                  onDownload={handleDownload}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="w-full max-w-full px-0">
            <div className="flex flex-col md:grid md:grid-cols-2 gap-4 w-full max-w-full">
              <Card className="w-full max-w-full">
                <CardHeader className="px-4">
                  <CardTitle className="text-base font-semibold">Batch Processing</CardTitle>
                  <CardDescription>
                    Process multiple images at once with the same settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-4">
                  <ImageUploader
                    images={images}
                    onImagesAdd={handleImagesAdd}
                    onImageRemove={handleImageRemove}
                    onImageSelect={setSelectedId}
                    selectedId={selectedId}
                  />
                </CardContent>
              </Card>

              <div className="space-y-4 w-full max-w-full">
                {selectedImage && (
                  <ImageSettingsPanel
                    image={selectedImage}
                    onSettingsChange={handleSettingsChange}
                    onApplyToAll={handleApplyToAll}
                    hasMultipleImages={images.length > 1}
                  />
                )}
                
                <BatchProcessor
                  images={images}
                  globalSettings={selectedImage?.settings || {
                    width: 1920,
                    height: 1080,
                    maintainAspectRatio: true,
                    quality: 85,
                    format: 'jpeg',
                    dpi: 72,
                    preserveMetadata: true,
                    filters: {
                      brightness: 100,
                      contrast: 100,
                      saturation: 100,
                      grayscale: 0,
                      sepia: 0,
                      blur: 0,
                      hueRotate: 0,
                    },
                    rotation: 0,
                    flipHorizontal: false,
                    flipVertical: false,
                  }}
                  aspectRatio={aspectRatio}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/40 bg-muted/30 w-full max-w-full">
        <div className="px-4 py-6 w-full max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-full">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LogoSmall size={32} />
                <span className="font-semibold">Image Modifier</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A powerful browser-based image processing tool. Resize, convert formats, 
                adjust quality, and modify metadata — all locally without uploading to any server.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Features</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Fast client-side processing
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  100% private — images never leave your device
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                  Supports JPG, PNG, WebP, GIF, BMP, TIFF
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Batch processing with ZIP download
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All image processing happens directly in your browser. 
                No data is ever uploaded to any server, ensuring complete privacy.
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Image Modifier. Open source project.</p>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>Your images never leave your device</span>
            </div>
          </div>
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
                <h4 className="text-sm font-medium">EXIF Control</h4>
                <p className="text-xs text-muted-foreground mt-0.5">You decide whether to keep or remove metadata like GPS location and camera info from your images.</p>
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
