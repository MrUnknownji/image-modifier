'use client';

import { useState } from 'react';
import {
  Package,
  Download,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import type { ProcessedImage, ImageSettings } from '@/types/image';
import { processImage, formatFileSize } from '@/lib/image-processing';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface BatchProcessorProps {
  images: ProcessedImage[];
  globalSettings: ImageSettings;
  aspectRatio: number | null;
}

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile: string;
}

export function BatchProcessor({
  images,
  globalSettings,
  aspectRatio,
}: BatchProcessorProps) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const processAllImages = async () => {
    if (images.length === 0) return;

    setProgress({
      total: images.length,
      completed: 0,
      failed: 0,
      currentFile: '',
    });
    setErrors([]);

    const zip = new (JSZip as any)();
    const processedImages: { name: string; blob: Blob }[] = [];
    const newErrors: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      setProgress((prev) => ({
        ...prev!,
        currentFile: image.metadata.name,
      }));

      try {
        const blob = await processImage(
          { ...image, settings: globalSettings },
          aspectRatio
        );
        const extension = globalSettings.format;
        const baseName = image.metadata.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}_processed.${extension}`;
        
        processedImages.push({ name: newName, blob });
        zip.file(newName, blob);
        
        setProcessedCount((prev) => prev + 1);
        setProgress((prev) => ({
          ...prev!,
          completed: prev!.completed + 1,
        }));
      } catch (error) {
        newErrors.push(`Failed to process ${image.metadata.name}`);
        setProgress((prev) => ({
          ...prev!,
          failed: prev!.failed + 1,
        }));
      }
    }

    if (processedImages.length > 0) {
      if (processedImages.length === 1) {
        const { name, blob } = processedImages[0];
        saveAs(blob, name);
      } else {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'processed_images.zip');
      }
    }

    setErrors(newErrors);
    setProgress(null);
  };

  const clearCompleted = () => {
    setProcessedCount(0);
    setErrors([]);
  };

  if (images.length === 0) {
    return null;
  }

  const totalSize = images.reduce((acc, img) => acc + img.metadata.size, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Batch Processing
            </CardTitle>
            <CardDescription>
              Process all {images.length} images with current settings
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {formatFileSize(totalSize)} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[200px]">
                Processing: {progress.currentFile}
              </span>
              <span className="font-medium">
                {progress.completed} / {progress.total}
              </span>
            </div>
            <Progress
              value={(progress.completed / progress.total) * 100}
              className="h-2"
            />
          </div>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errors.length} image(s) failed to process
            </AlertDescription>
          </Alert>
        )}

        {processedCount > 0 && !progress && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              {processedCount} image(s) processed successfully
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={processAllImages}
            disabled={!!progress}
            className="flex-1 gap-2"
          >
            {progress ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : images.length > 1 ? (
              <>
                <FileArchive className="h-4 w-4" />
                Download All as ZIP
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Process & Download
              </>
            )}
          </Button>
          
          {(processedCount > 0 || errors.length > 0) && !progress && (
            <Button variant="outline" size="icon" onClick={clearCompleted}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
