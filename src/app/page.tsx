'use client';

import { useState, useCallback, useEffect } from 'react';
import { ImagePlus, Wand2, Settings, Sparkles } from 'lucide-react';
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
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

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
  }, [selectedImage?.id, aspectRatio]);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Image Modifier</h1>
                <p className="text-xs text-muted-foreground">
                  Resize, convert, and optimize your images
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Sparkles className="h-4 w-4 mr-1" />
                Features
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="modify" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="modify" className="gap-2">
              <ImagePlus className="h-4 w-4" />
              Modify Images
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Batch Process
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modify" className="space-y-6">
            <div className="grid lg:grid-cols-[300px_1fr] gap-4 lg:gap-8">
              {/* Left Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Images</CardTitle>
                    <CardDescription>
                      Upload and manage your images
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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

          <TabsContent value="batch" className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Batch Processing</CardTitle>
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
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>Image Modifier - Process images locally in your browser</p>
            <p>Your images never leave your device</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
