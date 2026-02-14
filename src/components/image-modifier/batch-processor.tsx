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
  Images,
  Zap,
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
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import type { ProcessedImage, ImageSettings } from '@/types/image';
import { processImage, formatFileSize } from '@/lib/image-processing';
import JSZip from 'jszip';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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

    const zip = new JSZip();
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
        // Sanitize the filename to prevent path traversal
        const sanitizedName = image.metadata.name.split('/').pop()?.split('\\').pop() || image.metadata.name;
        const baseName = sanitizedName.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}_processed.${extension}`;
        
        processedImages.push({ name: newName, blob });
        zip.file(newName, blob);
        
        setProcessedCount((prev) => prev + 1);
        setProgress((prev) => ({
          ...prev!,
          completed: prev!.completed + 1,
        }));
      } catch {
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
        downloadBlob(blob, name);
      } else {
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, 'processed_images.zip');
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
  const progressPercent = progress ? (progress.completed / progress.total) * 100 : 0;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Batch Processing
            </CardTitle>
            <CardDescription className="text-xs">
              Process all {images.length} images with current settings
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-normal text-xs">
              <Images className="h-3 w-3 mr-1" />
              {images.length}
            </Badge>
            <Badge variant="outline" className="font-normal text-xs">
              {formatFileSize(totalSize)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        {progress && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/60">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                <span className="text-muted-foreground truncate">
                  {progress.currentFile}
                </span>
              </div>
              <span className="font-medium text-xs tabular-nums flex-shrink-0">
                {progress.completed} / {progress.total}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              Processing images... Please don&apos;t close this tab
            </p>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-medium">Processing Errors</AlertTitle>
            <AlertDescription className="text-xs">
              {errors.length} image{errors.length !== 1 ? 's' : ''} failed to process
            </AlertDescription>
          </Alert>
        )}

        {/* Success */}
        {processedCount > 0 && !progress && (
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-xs font-medium text-green-700 dark:text-green-400">
              Processing Complete
            </AlertTitle>
            <AlertDescription className="text-xs text-green-600 dark:text-green-400">
              {processedCount} image{processedCount !== 1 ? 's' : ''} processed successfully
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={processAllImages}
            disabled={!!progress}
            className="flex-1 gap-2"
            size="sm"
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
            <Button 
              variant="outline" 
              size="icon" 
              onClick={clearCompleted}
              className="h-9 w-9"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>Settings will be applied to all {images.length} images</span>
        </div>
      </CardContent>
    </Card>
  );
}
