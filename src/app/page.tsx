'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { processImage } from '@/lib/image-processing';
import type { ProcessedImage, ImageSettings } from '@/types/image';

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

import React from 'react';

function ImageModifierApp() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('modify');
  const [aspectRatio] = useState<number | null>(null);
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const imageUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedImage = images.find((img) => img.id === selectedId) || null;

  const handleImagesAdd = useCallback(async (files: FileList) => {
    const newImages: ProcessedImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      
      // Get image dimensions
      const img = new Image();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = url;
      });

      const id = Math.random().toString(36).substring(7);
      // Track URL in ref so we can revoke on unmount
      imageUrlsRef.current.set(id, url);

      const processedImage: ProcessedImage = {
        id,
        originalFile: file,
        originalUrl: url,
        processedUrl: null,
        metadata: {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        },
        dimensions,
        exif: null,
        settings: {
          format: (['jpeg', 'jpg', 'png', 'webp'].includes(file.type.split('/')[1]) ? file.type.split('/')[1].replace('jpg', 'jpeg') : 'webp') as 'jpeg' | 'png' | 'webp',
          quality: 80,
          width: dimensions.width,
          height: dimensions.height,
          maintainAspectRatio: true,
          preserveMetadata: true,
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
        },
        history: [],
        historyIndex: -1,
      };
      
      newImages.push(processedImage);
    }

    setImages((prev) => [...prev, ...newImages]);
    if (!selectedId && newImages.length > 0) {
      setSelectedId(newImages[0].id);
    }
    
    toast.success(`Added ${newImages.length} image(s)`);
  }, [selectedId]);

  const handleImageRemove = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find(i => i.id === id);
      if (img?.originalUrl) {
        URL.revokeObjectURL(img.originalUrl);
        imageUrlsRef.current.delete(id);
      }
      return prev.filter((i) => i.id !== id);
    });
    if (selectedId === id) {
      setSelectedId(null);
      setProcessedBlob(null);
    }
  }, [selectedId]);

  const handleSettingsChange = useCallback((settings: ImageSettings) => {
    if (!selectedId) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === selectedId ? { ...img, settings } : img
      )
    );
  }, [selectedId]);

  const handleApplyToAll = useCallback(() => {
    if (!selectedImage) return;
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        settings: { ...selectedImage.settings },
      }))
    );
    toast.success('Settings applied to all images');
  }, [selectedImage]);

  const handleDownload = useCallback(async () => {
    if (!processedBlob || !selectedImage) return;
    
    const url = URL.createObjectURL(processedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed_${selectedImage.metadata.name.split('.')[0]}.${selectedImage.settings.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Image downloaded successfully');
  }, [processedBlob, selectedImage]);

  const handleUndo = useCallback(() => {
    // History implementation would go here
  }, []);

  const handleRedo = useCallback(() => {
    // History implementation would go here
  }, []);

  // Process selected image whenever settings change
  useEffect(() => {
    if (!selectedImage) {
      setProcessedBlob(null);
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

    const timeoutId = setTimeout(processSelected, 150);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedImage, aspectRatio]);

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

  // Revoke all remaining blob URLs only when the component unmounts
  useEffect(() => {
    return () => {
      imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      imageUrlsRef.current.clear();
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
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
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
              >
                {mounted ? (
                  theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
          {/* Sidebar */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="flex flex-col gap-8 sticky top-24"
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
                />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4 text-xs font-medium text-muted-foreground list-none p-0">
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
              <TabsList className="mb-6">
                <TabsTrigger value="modify" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Modify Images
                </TabsTrigger>
                <TabsTrigger value="batch" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Batch Process
                </TabsTrigger>
              </TabsList>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <TabsContent value="modify" className="mt-0">
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8">
                      <div className="space-y-8">
                        <ImagePreview
                          image={selectedImage}
                          processedBlob={processedBlob}
                          isProcessing={isProcessing}
                          onDownload={handleDownload}
                        />
                      </div>
                      <div className="space-y-8">
                        <ImageSettingsPanel
                          image={selectedImage}
                          onSettingsChange={handleSettingsChange}
                          onApplyToAll={handleApplyToAll}
                          hasMultipleImages={images.length > 1}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="batch" className="mt-0">
                    <BatchProcessor 
                      images={images} 
                      globalSettings={images[0]?.settings || {
                        format: 'webp',
                        quality: 80,
                        width: 1920,
                        height: 1080,
                        maintainAspectRatio: true,
                        preserveMetadata: true,
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
                      aspectRatio={aspectRatio}
                    />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </motion.main>
        </div>
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="w-full border-t border-border/50 bg-muted/20 mt-16"
      >
        <div className="max-w-full mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {[
              { icon: Zap, title: "Fast Processing", desc: "Optimized algorithms for blazing fast results" },
              { icon: Lock, title: "Private & Secure", desc: "Your images never leave your device" },
              { icon: FileImage, title: "Multiple Formats", desc: "Supports all popular image formats" },
              { icon: Layers, title: "Batch Processing", desc: "Process multiple images at once" },
              { icon: Sparkles, title: "High Quality", desc: "Maintain quality while optimizing" }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-background/50 border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
              >
                <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/5 ring-1 ring-primary/10 group-hover:bg-primary/10 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground italic">
              © {new Date().getFullYear()} AuraEdit. Open source project.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-4 py-2 bg-background/50 rounded-full border border-border/50">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Your images never leave your device</span>
            </div>
          </div>
        </div>
      </motion.footer>

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
