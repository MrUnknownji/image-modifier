'use client';

import { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  ImageIcon,
  FileImage,
  Scale,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
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

  if (!image) {
    return (
      <Card className="h-full min-h-[400px]">
        <CardContent className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <ImageIcon className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg">No image selected</p>
          <p className="text-sm">Upload an image to start editing</p>
        </CardContent>
      </Card>
    );
  }

  const displayUrl =
    activeTab === 'processed' && processedBlob
      ? URL.createObjectURL(processedBlob)
      : image.originalUrl;

  const fileSize =
    activeTab === 'processed' && processedBlob
      ? processedBlob.size
      : image.metadata.size;

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 p-0 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === 'original' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('original')}
              >
                Original
              </Button>
              <Button
                variant={activeTab === 'processed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('processed')}
                disabled={!processedBlob}
              >
                Processed
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                    disabled={zoom <= 0.25}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>

              <span className="text-xs text-muted-foreground w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom(1)}
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit to screen</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <Button
                variant="default"
                size="sm"
                onClick={onDownload}
                disabled={!processedBlob || isProcessing}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          {/* Image Display */}
          <div className="flex-1 relative overflow-hidden bg-muted/50">
            {isProcessing ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Processing...</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full w-full">
                <div className="flex items-center justify-center p-4 min-h-[300px]">
                  <Dialog>
                    <DialogTrigger asChild>
                      <img
                        src={displayUrl}
                        alt={image.metadata.name}
                        className="max-w-full cursor-zoom-in transition-transform"
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: 'center center',
                        }}
                      />
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
                      <img
                        src={displayUrl}
                        alt={image.metadata.name}
                        className="w-full h-full object-contain"
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Info Bar */}
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <FileImage className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{image.metadata.name}</span>
              </div>

              <Separator orientation="vertical" className="h-4 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span>
                  {activeTab === 'original'
                    ? `${image.dimensions.width} × ${image.dimensions.height}`
                    : `${image.settings.width} × ${image.settings.height}`}
                </span>
              </div>

              <Separator orientation="vertical" className="h-4 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span>{formatFileSize(fileSize)}</span>
              </div>

              {activeTab === 'processed' && processedBlob && (
                <>
                  <Separator orientation="vertical" className="h-4 hidden sm:block" />
                  <Badge variant="secondary" className="text-xs">
                    {image.settings.format.toUpperCase()} • {image.settings.quality}%
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
