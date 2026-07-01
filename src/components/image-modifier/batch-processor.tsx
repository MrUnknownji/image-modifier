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
  Upload,
  Shield,
  MousePointer2,
  ListChecks,
  Users,
  SlidersHorizontal,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import type { ProcessedImage, ImageSettings } from '@/types/image';
import { processImage, formatFileSize, sanitizeBaseName } from '@/lib/image-processing';
import { pLimit } from '@/lib/concurrency';

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
  onRequestUpload: () => void;
  activeImageId: string | null;
  batchSelectedIds: string[];
  onBatchSelectionChange: (ids: string[]) => void;
}

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile: string;
}

type ProcessingScope = 'active' | 'chosen' | 'all';

export function BatchProcessor({
  images,
  globalSettings,
  aspectRatio,
  onRequestUpload,
  activeImageId,
  batchSelectedIds,
  onBatchSelectionChange,
}: BatchProcessorProps) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [scope, setScope] = useState<ProcessingScope>('all');

  const activeImage =
    images.find((image) => image.id === activeImageId) ?? images[0] ?? null;
  const chosenIdSet = new Set(batchSelectedIds);
  const targetImages =
    scope === 'active'
      ? activeImage
        ? [activeImage]
        : []
      : scope === 'chosen'
        ? images.filter((image) => chosenIdSet.has(image.id))
        : images;

  const processAllImages = async () => {
    if (targetImages.length === 0) return;

    setProgress({
      total: targetImages.length,
      completed: 0,
      failed: 0,
      currentFile: '',
    });
    setProcessedCount(0);
    setErrors([]);

    const processedImages: { name: string; blob: Blob }[] = [];
    const newErrors: string[] = [];
    const limit = pLimit(3);
    const filenameCounts = new Map<string, number>();

    const tasks = targetImages.map((image) =>
      limit(async () => {
        setProgress((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            currentFile: image.metadata.name,
          };
        });

        try {
          const blob = await processImage(
            { ...image, settings: globalSettings },
            aspectRatio
          );
          const baseName = sanitizeBaseName(image.metadata.name);
          const duplicateIndex = filenameCounts.get(baseName) ?? 0;
          filenameCounts.set(baseName, duplicateIndex + 1);
          const uniqueSuffix = duplicateIndex === 0 ? '' : `-${duplicateIndex + 1}`;
          const newName = `${baseName}${uniqueSuffix}-edited.${globalSettings.format}`;

          processedImages.push({ name: newName, blob });
          setProgress((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              completed: prev.completed + 1,
            };
          });
        } catch {
          newErrors.push(`Failed to process ${image.metadata.name}`);
          setProgress((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              failed: prev.failed + 1,
            };
          });
        }
      })
    );

    await Promise.all(tasks);
    setProcessedCount(processedImages.length);

    if (processedImages.length > 0) {
      if (processedImages.length === 1) {
        const { name, blob } = processedImages[0];
        downloadBlob(blob, name);
      } else {
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        processedImages.forEach(({ name, blob }) => zip.file(name, blob));
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, 'auraedit-images.zip');
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
    return (
      <Card className="flex min-h-[520px] items-center justify-center border border-dashed border-primary/25 bg-[radial-gradient(circle_at_50%_42%,color-mix(in_oklab,var(--primary)_9%,transparent),transparent_38%)] shadow-sm sm:min-h-[580px]">
        <CardContent className="flex max-w-lg flex-col items-center px-6 py-12 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-background shadow-xl shadow-primary/10">
            <Images className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Process a whole set at once</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Add two or more images, tune one set of output settings, then download everything in a single ZIP.
          </p>
          <Button onClick={onRequestUpload} className="mt-7 h-11 rounded-xl px-6">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Choose images
          </Button>
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              3 at a time
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              On-device only
            </span>
            <span className="flex items-center gap-1.5">
              <FileArchive className="h-3.5 w-3.5 text-primary" />
              One ZIP
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSize = targetImages.reduce((acc, img) => acc + img.metadata.size, 0);
  const progressPercent = progress ? ((progress.completed + progress.failed) / progress.total) * 100 : 0;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Batch Processing
            </CardTitle>
            <CardDescription className="text-xs">
              Choose who gets the current image&apos;s settings, then process
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="secondary" className="font-normal text-xs">
              <Images className="h-3 w-3 mr-1" />
              {targetImages.length} of {images.length}
            </Badge>
            <Badge variant="outline" className="font-normal text-xs">
              {formatFileSize(totalSize)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                Apply these settings to
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Settings source: {activeImage?.metadata.name ?? 'Current image'}
              </p>
            </div>
            <Badge variant="outline" className="self-start text-[10px] font-normal sm:self-auto">
              {targetImages.length} target{targetImages.length === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              {
                value: 'active' as const,
                icon: MousePointer2,
                title: 'Current image',
                detail: activeImage ? '1 image' : 'None',
              },
              {
                value: 'chosen' as const,
                icon: ListChecks,
                title: 'Chosen images',
                detail: `${batchSelectedIds.length} selected`,
              },
              {
                value: 'all' as const,
                icon: Users,
                title: 'Entire batch',
                detail: `${images.length} images`,
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setScope(option.value)}
                aria-pressed={scope === option.value}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                  scope === option.value
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/60 bg-background/60 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  scope === option.value ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  <option.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{option.title}</span>
                  <span className="block text-[10px]">{option.detail}</span>
                </span>
              </button>
            ))}
          </div>

          {scope === 'chosen' && (
            <div className="rounded-xl border border-border/60 bg-background/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold">Choose batch images</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => onBatchSelectionChange(images.map((image) => image.id))}
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => onBatchSelectionChange([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid max-h-48 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {images.map((image) => {
                  const checkboxId = `batch-${image.id}`;
                  const isChosen = chosenIdSet.has(image.id);
                  return (
                    <label
                      key={image.id}
                      htmlFor={checkboxId}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${
                        isChosen
                          ? 'border-primary/35 bg-primary/[0.07]'
                          : 'border-border/50 bg-muted/20'
                      }`}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={isChosen}
                        onCheckedChange={(checked) => {
                          const next = new Set(batchSelectedIds);
                          if (checked) next.add(image.id);
                          else next.delete(image.id);
                          onBatchSelectionChange([...next]);
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium text-foreground">
                          {image.metadata.name}
                        </span>
                        <span className="block text-[9px] text-muted-foreground">
                          {image.dimensions.width}×{image.dimensions.height}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Output</p>
            <p className="mt-1 text-sm font-semibold">
              {globalSettings.format.toUpperCase()}
              {globalSettings.format !== 'png' ? ` · ${globalSettings.quality}%` : ' · Lossless'}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dimensions</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {globalSettings.width} × {globalSettings.height}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Privacy</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
              <Shield className="h-3.5 w-3.5 text-primary" />
              {globalSettings.preserveMetadata ? 'Preserve JPEG EXIF' : 'Metadata removed'}
            </p>
          </div>
        </div>

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
                {progress.completed + progress.failed} / {progress.total}
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
            disabled={!!progress || targetImages.length === 0}
            className="flex-1 gap-2"
            size="sm"
          >
            {progress ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : targetImages.length > 1 ? (
              <>
                <FileArchive className="h-4 w-4" />
                Process {targetImages.length} & Download ZIP
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
              aria-label="Clear batch result"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>
            {targetImages.length > 0
              ? `Current settings will be used for ${targetImages.length} image${targetImages.length === 1 ? '' : 's'}`
              : 'Choose at least one image to continue'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
