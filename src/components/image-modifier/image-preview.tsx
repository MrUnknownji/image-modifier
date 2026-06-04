'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  ImageIcon,
  FileImage,
  Scale,
  Info,
  Eye,
  Camera,
  Calendar,
  Aperture,
  X,
  Sparkles,
  Upload,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatFileSize } from '@/lib/image-processing';
import type { ProcessedImage } from '@/types/image';

interface ImagePreviewProps {
  image: ProcessedImage | null;
  processedBlob: Blob | null;
  isProcessing: boolean;
  onDownload: () => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function ImagePreview({
  image,
  processedBlob,
  isProcessing,
  onDownload,
}: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<'original' | 'processed'>('processed');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!processedBlob) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlobUrl(null);
      return;
    }

    const url = URL.createObjectURL(processedBlob);
    setBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [processedBlob]);

  const displayUrl = useMemo(() => {
    if (activeTab === 'processed' && blobUrl) {
      return blobUrl;
    }
    return image?.originalUrl || '';
  }, [activeTab, blobUrl, image?.originalUrl]);

  const fileSize =
    activeTab === 'processed' && processedBlob
      ? processedBlob.size
      : image?.metadata.size || 0;

  const dimensions = useMemo(() => {
    if (!image) return '';

    if (activeTab === 'original') {
      return `${image.dimensions.width}×${image.dimensions.height}`;
    }

    return `${image.settings.width}×${image.settings.height}`;
  }, [activeTab, image]);

  const fileExtension = image?.metadata.name.split('.').pop()?.toUpperCase() || '';
  const outputExtension = activeTab === 'processed' ? image?.settings.format.toUpperCase() : fileExtension;
  const isProcessedViewReady = activeTab === 'processed' && !!processedBlob && !!blobUrl;

  const formatExifDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const handleZoomOut = useCallback(() => {
    setZoom((current) => clampZoom(current - ZOOM_STEP));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((current) => clampZoom(current + ZOOM_STEP));
  }, []);

  const handleFitToView = useCallback(() => {
    setZoom(1);
  }, []);

  const handleOpenInBrowser = useCallback(() => {
    if (!displayUrl) return;

    const link = document.createElement('a');
    link.href = displayUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [displayUrl]);

  if (!image) {
    return (
      <Card className="border-border/50 h-full min-h-[750px] lg:min-h-[800px] w-full max-w-full rounded-3xl shadow-sm bg-background/50 flex items-center justify-center border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center h-full text-center p-12">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150 animate-pulse" />
            <div className="relative flex items-center justify-center h-48 w-48 rounded-3xl bg-muted/30 shadow-2xl shadow-primary/5 border border-primary/20 backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="none" className="w-24 h-24 text-primary/40">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="absolute -top-4 -right-4 h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">No image selected</h3>
          <p className="text-sm text-muted-foreground max-w-[250px] mx-auto mb-8 font-medium">
            Upload an image to start editing and optimizing your visuals
          </p>
          <Button
            className="rounded-full px-8 py-6 h-auto text-base"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="h-5 w-5 mr-3" />
            Choose Image
          </Button>
          <p className="text-xs text-muted-foreground/60 mt-4 font-bold uppercase tracking-widest">
            or drag and drop here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 h-full flex flex-col w-full max-w-full overflow-hidden rounded-3xl bg-card/95 shadow-xl shadow-primary/5">
      <CardContent className="flex-1 p-0 flex flex-col w-full max-w-full">
        <div className="border-b border-border/60 bg-gradient-to-r from-background via-muted/40 to-background px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{image.metadata.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 ring-1 ring-border/60">
                      <Scale className="h-3 w-3" />
                      {dimensions}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 ring-1 ring-border/60">
                      <Info className="h-3 w-3" />
                      {formatFileSize(fileSize)}
                    </span>
                    {outputExtension && (
                      <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] font-semibold">
                        {outputExtension}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="inline-flex rounded-full border border-border/70 bg-background/70 p-1 shadow-sm backdrop-blur">
                <Button
                  variant={activeTab === 'original' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('original');
                    setZoom(1);
                  }}
                  className="h-8 rounded-full px-3 text-xs gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Original
                </Button>
                <Button
                  variant={activeTab === 'processed' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setActiveTab('processed');
                    setZoom(1);
                  }}
                  disabled={!processedBlob}
                  className="h-8 rounded-full px-3 text-xs gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Processed
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-full border border-border/70 bg-background/80 p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={handleZoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <span className="w-14 text-center font-mono text-[11px] font-semibold text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={handleZoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={handleFitToView}
                  disabled={zoom === 1}
                  aria-label="Fit image to view"
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInBrowser}
                disabled={!displayUrl || (activeTab === 'processed' && !isProcessedViewReady)}
                className="h-9 rounded-full gap-2 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open in Browser</span>
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={onDownload}
                disabled={!processedBlob || isProcessing}
                className="h-9 rounded-full gap-2 text-xs shadow-lg shadow-primary/20"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,var(--accent),transparent_30%),linear-gradient(45deg,var(--muted)_25%,transparent_25%),linear-gradient(-45deg,var(--muted)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--muted)_75%),linear-gradient(-45deg,transparent_75%,var(--muted)_75%)] bg-[length:100%_100%,24px_24px,24px_24px,24px_24px,24px_24px] bg-[position:0_0,0_0,0_12px,12px_-12px,-12px_0] min-h-[650px] lg:min-h-[760px]">
          {isProcessing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-border/70 bg-card/95 px-8 py-7 shadow-2xl">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Processing image</p>
                  <p className="text-xs text-muted-foreground">Applying changes locally in your browser</p>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="flex min-h-[650px] items-center justify-center p-6 lg:min-h-[760px]">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="group relative flex w-full cursor-zoom-in items-center justify-center rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label={`Open ${image.metadata.name} in immersive preview`}
                    >
                      <div className="absolute inset-6 rounded-full bg-primary/20 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={displayUrl}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="relative rounded-3xl border border-border/60 bg-background/80 p-3 shadow-2xl shadow-black/10 backdrop-blur"
                          style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? 'min(100%, 960px)' : 'none' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={displayUrl}
                            alt={image.metadata.name}
                            className="h-auto w-full rounded-2xl object-contain"
                            draggable={false}
                          />
                          <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                            Click for immersive preview
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </button>
                  </DialogTrigger>

                  <DialogContent showCloseButton={false} className="max-w-[96vw] max-h-[96vh] p-0 overflow-hidden border-white/10 bg-black/95 text-white shadow-2xl">
                    <DialogTitle className="sr-only">
                      {image.metadata.name} - Image Preview
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Full size preview of {image.metadata.name}
                    </DialogDescription>

                    <DialogClose className="absolute top-4 right-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </DialogClose>

                    <div className="absolute left-0 right-0 top-0 z-50 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-5 py-4 pr-16">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{image.metadata.name}</p>
                        <p className="text-xs text-white/65">{dimensions} • {formatFileSize(fileSize)}</p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleOpenInBrowser}
                        className="hidden h-9 rounded-full gap-2 bg-white/10 text-white hover:bg-white/20 sm:inline-flex"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Browser
                      </Button>
                    </div>

                    <div className="flex h-[96vh] w-full items-center justify-center overflow-auto p-5 pt-20 pb-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayUrl}
                        alt={image.metadata.name}
                        className="max-h-[calc(96vh-8rem)] max-w-full rounded-2xl object-contain shadow-2xl"
                      />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent px-5 py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/90">
                        {outputExtension && (
                          <Badge variant="secondary" className="h-6 rounded-full border-white/10 bg-white/15 px-2 text-[10px] text-white">
                            {outputExtension}
                          </Badge>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Scale className="h-3.5 w-3.5 text-white/60" />
                          <span>{dimensions}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-white/60" />
                          <span>{formatFileSize(fileSize)}</span>
                        </div>

                        {image.exif?.Make && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5 text-white/60" />
                            <span>{image.exif.Make} {image.exif.Model}</span>
                          </div>
                        )}

                        {image.exif?.DateTimeOriginal && formatExifDate(image.exif.DateTimeOriginal) && (
                          <div className="hidden md:flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-white/60" />
                            <span>{formatExifDate(image.exif.DateTimeOriginal)}</span>
                          </div>
                        )}

                        {image.exif?.FNumber && (
                          <div className="hidden lg:flex items-center gap-1.5">
                            <Aperture className="h-3.5 w-3.5 text-white/60" />
                            <span>f/{image.exif.FNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <div className="flex min-w-0 items-center gap-1.5">
              <FileImage className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
              <span className="max-w-[220px] truncate font-medium text-foreground">
                {image.metadata.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 text-muted-foreground">
              <Scale className="h-3.5 w-3.5" />
              <span>{dimensions}</span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>{formatFileSize(fileSize)}</span>
            </div>

            {activeTab === 'processed' && processedBlob && (
              <Badge variant="secondary" className="h-6 rounded-full text-[10px] font-semibold">
                {image.settings.format.toUpperCase()} • {image.settings.quality}% quality
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
