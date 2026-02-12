'use client';

import { useState, useCallback, useEffect } from 'react';
import { ImagePlus, Sparkles, Github, Shield, Zap, Image as ImageIcon } from 'lucide-react';
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

export default function Home() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio] = useState<number | null>(null);

  const selectedImage = images.find((img) => img.id === selectedId) || null;

  const handleImagesAdd = useCallback(
    async (files: FileList) => {
      const newImages: ProcessedImage[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          try {
            const processedImage = await createProcessedImage(file);
            newImages.push(processedImage);
          } catch (error) {
            console.error('Failed to process image:', error);
          }
        }
      }

      setImages((prev) => [...prev, ...newImages]);
      
      if (newImages.length > 0 && !selectedId) {
        setSelectedId(newImages[0].id);
      }
    },
    [selectedId]
  );

  const handleImageRemove = useCallback((id: string) => {
    setImages((prev) => {
      const newImages = prev.filter((img) => img.id !== id);
      if (id === selectedId) {
        setSelectedId(newImages.length > 0 ? newImages[0].id : null);
      }
      return newImages;
    });
    setProcessedBlob(null);
  }, [selectedId]);

  const handleSettingsChange = useCallback(
    async (settings: ImageSettings) => {
      if (!selectedImage) return;

      setImages((prev) =>
        prev.map((img) =>
          img.id === selectedId ? { ...img, settings } : img
        )
      );

      // Auto-process when settings change
      setIsProcessing(true);
      try {
        const updatedImage = { ...selectedImage, settings };
        const blob = await processImage(updatedImage, aspectRatio);
        setProcessedBlob(blob);
      } catch (error) {
        console.error('Failed to process image:', error);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedImage, selectedId, aspectRatio]
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
  }, [selectedImage, selectedId]);

  const handleDownload = useCallback(() => {
    if (!processedBlob || !selectedImage) return;
    
    const url = URL.createObjectURL(processedBlob);
    const extension = selectedImage.settings.format;
    const baseName = selectedImage.metadata.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}_processed.${extension}`;
    
    downloadImage(url, newName);
    URL.revokeObjectURL(url);
  }, [processedBlob, selectedImage]);

  // Process image when selection changes
  useEffect(() => {
    const processSelected = async () => {
      if (!selectedImage) {
        setProcessedBlob(null);
        return;
      }

      setIsProcessing(true);
      try {
        const blob = await processImage(selectedImage, aspectRatio);
        setProcessedBlob(blob);
      } catch (error) {
        console.error('Failed to process image:', error);
        setProcessedBlob(null);
      } finally {
        setIsProcessing(false);
      }
    };

    processSelected();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImage?.id, aspectRatio, selectedImage]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size={40} />
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Image Modifier</h1>
                <p className="text-xs text-muted-foreground">
                  Resize, convert, and optimize your images
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Zap className="h-4 w-4" />
                Features
              </Button>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Shield className="h-4 w-4" />
                Privacy
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Tabs defaultValue="modify" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-2">
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

          <TabsContent value="modify" className="space-y-6">
            <div className="grid lg:grid-cols-[minmax(0,380px)_1fr] gap-6">
              {/* Left Sidebar */}
              <div className="space-y-6 min-w-0 w-full">
                <Card className="overflow-hidden min-w-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Images
                    </CardTitle>
                    <CardDescription>
                      Upload and manage your images
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="min-w-0 w-full">
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

              {/* Main Preview Area */}
              <div className="space-y-6">
                <ImagePreview
                  image={selectedImage}
                  processedBlob={processedBlob}
                  isProcessing={isProcessing}
                  onDownload={handleDownload}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Batch Processing</CardTitle>
                  <CardDescription>
                    Process multiple images at once with the same settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ImageUploader
                    images={images}
                    onImagesAdd={handleImagesAdd}
                    onImageRemove={handleImageRemove}
                    onImageSelect={setSelectedId}
                    selectedId={selectedId}
                  />
                </CardContent>
              </Card>

              <div className="space-y-6">
                {selectedImage && (
                  <ImageSettingsPanel
                    image={selectedImage}
                    onSettingsChange={(settings) => {
                      setImages((prev) =>
                        prev.map((img) =>
                          img.id === selectedId ? { ...img, settings } : img
                        )
                      );
                    }}
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
                  }}
                  aspectRatio={aspectRatio}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
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

            {/* Features */}
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

            {/* Privacy & Links */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All image processing happens directly in your browser. 
                No data is ever uploaded to any server, ensuring complete privacy.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href="https://github.com/MrUnknownji/image-modifier" target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4" />
                    GitHub
                  </a>
                </Button>
              </div>
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
    </div>
  );
}
