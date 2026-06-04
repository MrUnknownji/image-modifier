'use client';

import { useMemo, useState } from 'react';
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
  Settings2,
  Gauge,
  FileDown,
  Sparkles,
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
import { pLimit } from '@/lib/concurrency';
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

function getSafeBaseName(filename: string) {
  const sanitizedName = filename.split('/').pop()?.split('\\').pop() || filename;
  return sanitizedName.replace(/\.[^/.]+$/, '') || 'image';
}

function createUniqueOutputName(filename: string, extension: string, usedNames: Set<string>) {
  const baseName = getSafeBaseName(filename);
  let candidate = `${baseName}_processed.${extension}`;
  let suffix = 2;

  while (usedNames.has(candidate)) {
    candidate = `${baseName}_processed_${suffix}.${extension}`;
    suffix += 1;
  }

  usedNames.add(candidate);
  return candidate;
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

interface BatchSuccess {
  ok: true;
  index: number;
  name: string;
  blob: Blob;
}

interface BatchFailure {
  ok: false;
  index: number;
  name: string;
  error: string;
}

type BatchResult = BatchSuccess | BatchFailure;

export function BatchProcessor({
  images,
  globalSettings,
  aspectRatio,
}: BatchProcessorProps) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [processedBytes, setProcessedBytes] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const totalSize = useMemo(
    () => images.reduce((acc, img) => acc + img.metadata.size, 0),
    [images]
  );

  const estimatedOutputLabel = useMemo(() => {
    const width = globalSettings.width || images[0]?.dimensions.width || 0;
    const height = globalSettings.height || images[0]?.dimensions.height || 0;
    return width > 0 && height > 0 ? `${width}×${height}` : 'Original size';
  }, [globalSettings.height, globalSettings.width, images]);

  const completedWork = progress ? progress.completed + progress.failed : 0;
  const progressPercent = progress ? (completedWork / progress.total) * 100 : 0;
  const failedCount = progress?.failed ?? errors.length;
  const isProcessing = !!progress;

  const processAllImages = async () => {
    if (images.length === 0 || isProcessing) return;

    setProgress({
      total: images.length,
      completed: 0,
      failed: 0,
      currentFile: 'Preparing batch...',
    });
    setProcessedCount(0);
    setProcessedBytes(0);
    setErrors([]);

    const limit = pLimit(3);
    const usedNames = new Set<string>();

    const tasks = images.map((image, index) =>
      limit(async (): Promise<BatchResult> => {
        setProgress((prev) => prev ? { ...prev, currentFile: image.metadata.name } : prev);

        try {
          const blob = await processImage(
            { ...image, settings: globalSettings },
            aspectRatio
          );
          const name = createUniqueOutputName(image.metadata.name, globalSettings.format, usedNames);

          setProgress((prev) => prev ? { ...prev, completed: prev.completed + 1 } : prev);
          return { ok: true, index, name, blob };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown processing error';
          setProgress((prev) => prev ? { ...prev, failed: prev.failed + 1 } : prev);
          return {
            ok: false,
            index,
            name: image.metadata.name,
            error: `Failed to process ${image.metadata.name}: ${message}`,
          };
        }
      })
    );

    const results = await Promise.all(tasks);
    const successfulImages = results
      .filter((result): result is BatchSuccess => result.ok)
      .sort((a, b) => a.index - b.index);
    const newErrors = results
      .filter((result): result is BatchFailure => !result.ok)
      .sort((a, b) => a.index - b.index)
      .map((result) => result.error);
    const totalProcessedBytes = successfulImages.reduce((total, result) => total + result.blob.size, 0);

    if (successfulImages.length > 0) {
      if (successfulImages.length === 1) {
        const { name, blob } = successfulImages[0];
        downloadBlob(blob, name);
      } else {
        const zip = new JSZip();
        successfulImages.forEach(({ name, blob }) => {
          zip.file(name, blob);
        });
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, `auraedit_${successfulImages.length}_images.zip`);
      }
    }

    setProcessedCount(successfulImages.length);
    setProcessedBytes(totalProcessedBytes);
    setErrors(newErrors);
    setProgress(null);
  };

  const clearCompleted = () => {
    setProcessedCount(0);
    setProcessedBytes(0);
    setErrors([]);
  };

  if (images.length === 0) {
    return (
      <Card className="overflow-hidden rounded-3xl border-dashed border-border/60 bg-card/70 shadow-xl shadow-primary/5">
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Images className="h-9 w-9" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground">No images queued</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Upload multiple images first, then return here to process and download them together.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/95 shadow-xl shadow-primary/5">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-muted/30 to-background pb-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Batch Processing</CardTitle>
                <CardDescription className="mt-1 text-sm">
                  Convert, resize, and download every queued image with one click.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="h-7 rounded-full gap-1.5 px-3 text-xs">
                <Images className="h-3.5 w-3.5" />
                {images.length} image{images.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="h-7 rounded-full px-3 text-xs">
                Source: {formatFileSize(totalSize)}
              </Badge>
              <Badge variant="outline" className="h-7 rounded-full px-3 text-xs uppercase">
                {globalSettings.format}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[460px]">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5 text-primary" />
                Output
              </div>
              <p className="mt-2 text-sm font-bold text-foreground">{estimatedOutputLabel}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <Gauge className="h-3.5 w-3.5 text-primary" />
                Quality
              </div>
              <p className="mt-2 text-sm font-bold text-foreground">{globalSettings.quality}%</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Parallel
              </div>
              <p className="mt-2 text-sm font-bold text-foreground">3 at once</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <FileDown className="h-3.5 w-3.5 text-primary" />
                Delivery
              </div>
              <p className="mt-2 text-sm font-bold text-foreground">{images.length > 1 ? 'ZIP file' : 'Image file'}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {progress && (
          <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/5 p-4 shadow-inner">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Processing batch locally</p>
                  <p className="truncate text-xs text-muted-foreground">{progress.currentFile}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-mono text-sm font-bold text-foreground">
                  {completedWork} / {progress.total}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {progress.completed} done · {progress.failed} failed
                </p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2.5 bg-background/80" />
            <p className="text-[11px] text-muted-foreground">
              Keep this tab open. Images are processed in your browser and are not uploaded.
            </p>
          </div>
        )}

        {errors.length > 0 && (
          <Alert variant="destructive" className="rounded-2xl border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">{errors.length} image{errors.length !== 1 ? 's' : ''} failed</AlertTitle>
            <AlertDescription className="text-xs">
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {errors.slice(0, 3).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
              {errors.length > 3 && (
                <p className="mt-2">And {errors.length - 3} more failure{errors.length - 3 !== 1 ? 's' : ''}.</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {processedCount > 0 && !progress && (
          <Alert className="rounded-2xl border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-sm font-semibold text-green-700 dark:text-green-300">
              Batch complete
            </AlertTitle>
            <AlertDescription className="text-xs text-green-700 dark:text-green-300">
              Downloaded {processedCount} image{processedCount !== 1 ? 's' : ''}
              {processedBytes > 0 ? ` (${formatFileSize(processedBytes)} total)` : ''}.
              {failedCount > 0 ? ` ${failedCount} item${failedCount !== 1 ? 's' : ''} failed.` : ''}
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Ready to process
              </div>
              <p className="text-xs text-muted-foreground">
                Current settings will be applied to all {images.length} queued image{images.length !== 1 ? 's' : ''}.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={processAllImages}
                disabled={isProcessing}
                className="h-11 rounded-full gap-2 px-6 shadow-lg shadow-primary/20"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : images.length > 1 ? (
                  <>
                    <FileArchive className="h-4 w-4" />
                    Process & Download ZIP
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Process & Download
                  </>
                )}
              </Button>

              {(processedCount > 0 || errors.length > 0) && !isProcessing && (
                <Button
                  variant="outline"
                  onClick={clearCompleted}
                  className="h-11 rounded-full gap-2 px-4"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear status
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Privacy first</p>
            <p className="mt-1">Everything runs locally in your browser.</p>
          </div>
          <div className="rounded-2xl bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Safe filenames</p>
            <p className="mt-1">Downloads are sanitized and duplicate-safe.</p>
          </div>
          <div className="rounded-2xl bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Fast queue</p>
            <p className="mt-1">Up to three images process in parallel.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
