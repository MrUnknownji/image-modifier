'use client';

import { useState, useMemo } from 'react';
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

  // Memoize display URL to prevent unnecessary re-renders
  const displayUrl = useMemo(() => {
    return activeTab === 'processed' && processedBlob
      ? URL.createObjectURL(processedBlob)
      : image?.originalUrl || '';
  }, [activeTab, processedBlob, image?.originalUrl]);

  // Note: blob URL cleanup is handled by the browser when the component unmounts

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
      <Card className="border-border/60 h-full min-h-[400px]">
        <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium text-foreground">No image selected</p>
          <p className="text-sm text-muted-foreground mt-1">Upload an image to start editing</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 h-full flex flex-col">
      <CardContent className="flex-1 p-0 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-1.5">
            <Button
              variant={activeTab === 'original' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('original')}
              className="h-8 text-xs gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" />
              Original
            </Button>
            <Button
              variant={activeTab === 'processed' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('processed')}
              disabled={!processedBlob}
              className="h-8 text-xs gap-1.5"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Processed
            </Button>
          </div>

          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  disabled={zoom <= 0.25}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>

            <span className="text-xs text-muted-foreground w-14 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5 mx-1.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(1)}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset zoom</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5 mx-1.5" />

            <Button
              variant="default"
              size="sm"
              onClick={onDownload}
              disabled={!processedBlob || isProcessing}
              className="h-8 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 relative overflow-hidden bg-muted/30">
          {isProcessing ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Processing...</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Applying changes</p>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="flex items-center justify-center p-6 min-h-[350px]">
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
                    {/* Hidden title for accessibility */}
                    <DialogTitle className="sr-only">
                      {image.metadata.name} - Image Preview
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Full size preview of {image.metadata.name}
                    </DialogDescription>
                    
                    {/* Close Button */}
                    <DialogClose className="absolute top-4 right-4 z-[60] flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur text-white transition-all hover:bg-white/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/30">
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close</span>
                    </DialogClose>

                    {/* Image Viewer Header */}
                    <div className="absolute top-0 left-0 right-0 z-50 flex items-center px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
                          <ImageIcon className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate max-w-[calc(95vw-120px)]">
                            {image.metadata.name}
                          </p>
                          <p className="text-xs text-white/70">
                            {activeTab === 'original' 
                              ? `${image.dimensions.width} × ${image.dimensions.height}` 
                              : `${image.settings.width} × ${image.settings.height}`} • {formatFileSize(fileSize)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Main Image */}
                    <div className="flex items-center justify-center w-full h-full p-4 pt-16">
                      <img
                        src={displayUrl}
                        alt={image.metadata.name}
                        className="max-w-full max-h-[calc(95vh-6rem)] object-contain rounded-sm shadow-2xl"
                      />
                    </div>

                    {/* Bottom Info Bar */}
                    <div className="absolute bottom-0 left-0 right-0 z-50 px-4 py-3 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/90">
                        <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px]">
                          {fileExtension}
                        </Badge>
                        
                        <div className="flex items-center gap-1.5">
                          <Scale className="h-3.5 w-3.5 text-white/70" />
                          <span>
                            {activeTab === 'original'
                              ? `${image.dimensions.width} × ${image.dimensions.height}`
                              : `${image.settings.width} × ${image.settings.height}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 text-white/70" />
                          <span>{formatFileSize(fileSize)}</span>
                        </div>

                        {/* EXIF Data if available */}
                        {image.exif?.Make && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            <Camera className="h-3.5 w-3.5 text-white/70" />
                            <span>{image.exif.Make} {image.exif.Model}</span>
                          </div>
                        )}

                        {image.exif?.DateTimeOriginal && formatExifDate(image.exif.DateTimeOriginal) && (
                          <div className="hidden md:flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-white/70" />
                            <span>{formatExifDate(image.exif.DateTimeOriginal)}</span>
                          </div>
                        )}

                        {image.exif?.FNumber && (
                          <div className="hidden lg:flex items-center gap-1.5">
                            <Aperture className="h-3.5 w-3.5 text-white/70" />
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
        <div className="px-4 py-3 border-t border-border/60 bg-muted/20">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileImage className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-foreground truncate max-w-[180px]">
                {image.metadata.name}
              </span>
            </div>

            <Separator orientation="vertical" className="h-3.5 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {activeTab === 'original'
                  ? `${image.dimensions.width} × ${image.dimensions.height}`
                  : `${image.settings.width} × ${image.settings.height}`}
              </span>
            </div>

            <Separator orientation="vertical" className="h-3.5 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{formatFileSize(fileSize)}</span>
            </div>

            {activeTab === 'processed' && processedBlob && (
              <>
                <Separator orientation="vertical" className="h-3.5 hidden sm:block" />
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {image.settings.format.toUpperCase()} • {image.settings.quality}%
                </Badge>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
