'use client';

import { useCallback } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatFileSize } from '@/lib/image-processing';
import type { ProcessedImage } from '@/types/image';

interface ImageUploaderProps {
  images: ProcessedImage[];
  onImagesAdd: (files: FileList) => void;
  onImageRemove: (id: string) => void;
  onImageSelect: (id: string) => void;
  selectedId: string | null;
}

export function ImageUploader({
  images,
  onImagesAdd,
  onImageRemove,
  onImageSelect,
  selectedId,
}: ImageUploaderProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onImagesAdd(files);
      }
    },
    [onImagesAdd]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onImagesAdd(e.target.files);
      }
    },
    [onImagesAdd]
  );

  return (
    <div className="space-y-4">
      <Card
        className="border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">Drag & drop images here</p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse files
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports: JPG, PNG, WebP, GIF, BMP, TIFF
          </p>
        </div>
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </Card>

      {images.length > 0 && (
        <ScrollArea className="h-[300px] rounded-md border border-border">
          <div className="p-4 space-y-2">
            {images.map((image) => (
              <div
                key={image.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  selectedId === image.id
                    ? 'bg-accent border-primary/50 border shadow-sm'
                    : 'hover:bg-muted border border-transparent'
                }`}
                onClick={() => onImageSelect(image.id)}
              >
                <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  {image.originalUrl ? (
                    <img
                      src={image.originalUrl}
                      alt={image.metadata.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 m-auto text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {image.metadata.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {image.dimensions.width} × {image.dimensions.height} •{' '}
                    {formatFileSize(image.metadata.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageRemove(image.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {images.length > 0 && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{images.length} image(s)</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              images.forEach((img) => onImageRemove(img.id))
            }
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
