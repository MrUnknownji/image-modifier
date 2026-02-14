'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

export function ImagePreview({
  image,
  processedBlob,
  isProcessing,
  onDownload,
}: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<'original' | 'processed'>('processed');
  const [dialogOpen, setDialogOpen] = useState(false);
  const prevBlobUrlRef = useRef<string | null>(null);

  const blobUrl = useMemo(() => {
    if (processedBlob) {
      return URL.createObjectURL(processedBlob);
    }
    return null;
  }, [processedBlob]);

  useEffect(() => {
    if (prevBlobUrlRef.current && prevBlobUrlRef.current !== blobUrl) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
    }
    prevBlobUrlRef.current = blobUrl;
  }, [blobUrl]);

  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
    };
  }, []);

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

  // Get file extension
  const fileExtension = image?.metadata.name.split('.').pop()?.toUpperCase() || '';

  // Format date from EXIF
  const formatExifDate = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return null;
    }
  };

  if (!image) {
    return (
      <Card className="border-border/60 h-full min-h-[300px] w-full max-w-full">
        <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-foreground">No image selected</p>
          <p className="text-xs text-muted-foreground mt-1">Upload an image to start</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 h-full flex flex-col w-full max-w-full overflow-hidden">
      <CardContent className="flex-1 p-0 flex flex-col w-full max-w-full">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border/60 bg-muted/20 w-full">
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant={activeTab === 'original' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('original')}
              className="h-7 text-xs gap-1 px-2"
            >
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">Original</span>
            </Button>
            <Button
              variant={activeTab === 'processed' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('processed')}
              disabled={!processedBlob}
              className="h-7 text-xs gap-1 px-2"
            >
              <ImageIcon className="h-3 w-3" />
              <span className="hidden sm:inline">Processed</span>
            </Button>
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              disabled={zoom <= 0.25}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>

            <span className="text-[10px] text-muted-foreground w-10 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              disabled={zoom >= 3}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(1)}
            >
              <Maximize className="h-3.5 w-3.5" />
            </Button>

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Button
              variant="default"
              size="sm"
              onClick={onDownload}
              disabled={!processedBlob || isProcessing}
              className="h-7 text-xs gap-1 px-2"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 relative overflow-hidden bg-muted/30 min-h-[200px]">
          {isProcessing ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Processing...</p>
                  <p className="text-xs text-muted-foreground">Applying changes</p>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="flex items-center justify-center p-4 min-h-[250px]">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <div className="relative group cursor-zoom-in">
                      <img
                        src={displayUrl}
                        alt={image.metadata.name}
                        className="max-w-full transition-all duration-200 shadow-lg"
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: 'center center',
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-sm" />
                    </div>
                  </DialogTrigger>
                  <DialogContent showCloseButton={false} className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-background/95 backdrop-blur border-border/60">
                    <DialogTitle className="sr-only">
                      {image.metadata.name} - Image Preview
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Full size preview of {image.metadata.name}
                    </DialogDescription>
                    
                    <DialogClose className="absolute top-3 right-3 z-[60] flex h-7 w-7 items-center justify-center rounded-full bg-white/10 backdrop-blur text-white transition-all hover:bg-white/20 focus:outline-none">
                      <X className="h-3.5 w-3.5" />
                      <span className="sr-only">Close</span>
                    </DialogClose>

                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center px-3 py-2 bg-gradient-to-b from-black/60 to-transparent">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                          <ImageIcon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-white truncate">
                            {image.metadata.name}
                          </p>
                          <p className="text-[10px] text-white/70">
                            {activeTab === 'original' 
                              ? `${image.dimensions.width}×${image.dimensions.height}` 
                              : `${image.settings.width}×${image.settings.height}`} • {formatFileSize(fileSize)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center w-full h-full p-3 pt-12">
                      <img
                        src={displayUrl}
                        alt={image.metadata.name}
                        className="max-w-full max-h-[calc(95vh-5rem)] object-contain rounded-sm shadow-2xl"
                      />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 z-50 px-3 py-2 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/90">
                        <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px] h-5">
                          {fileExtension}
                        </Badge>
                        
                        <div className="flex items-center gap-1">
                          <Scale className="h-3 w-3 text-white/70" />
                          <span>
                            {activeTab === 'original'
                              ? `${image.dimensions.width}×${image.dimensions.height}`
                              : `${image.settings.width}×${image.settings.height}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Info className="h-3 w-3 text-white/70" />
                          <span>{formatFileSize(fileSize)}</span>
                        </div>

                        {image.exif?.Make && (
                          <div className="hidden sm:flex items-center gap-1">
                            <Camera className="h-3 w-3 text-white/70" />
                            <span>{image.exif.Make} {image.exif.Model}</span>
                          </div>
                        )}

                        {image.exif?.DateTimeOriginal && formatExifDate(image.exif.DateTimeOriginal) && (
                          <div className="hidden md:flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-white/70" />
                            <span>{formatExifDate(image.exif.DateTimeOriginal)}</span>
                          </div>
                        )}

                        {image.exif?.FNumber && (
                          <div className="hidden lg:flex items-center gap-1">
                            <Aperture className="h-3 w-3 text-white/70" />
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

        {/* Info Bar */}
        <div className="px-3 py-2 border-t border-border/60 bg-muted/20 w-full">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs w-full">
            <div className="flex items-center gap-1 min-w-0 max-w-[120px]">
              <FileImage className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-foreground truncate">
                {image.metadata.name}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Scale className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground text-[11px]">
                {activeTab === 'original'
                  ? `${image.dimensions.width}×${image.dimensions.height}`
                  : `${image.settings.width}×${image.settings.height}`}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Info className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground text-[11px]">{formatFileSize(fileSize)}</span>
            </div>

            {activeTab === 'processed' && processedBlob && (
              <Badge variant="secondary" className="text-[10px] font-normal h-5">
                {image.settings.format.toUpperCase()} • {image.settings.quality}%
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
