"use client";

import { useCallback } from "react";
import { Upload, X, ImageIcon, Trash2, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatFileSize } from "@/lib/image-processing";
import type { ProcessedImage } from "@/types/image";

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
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onImagesAdd(files);
      }
    },
    [onImagesAdd],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onImagesAdd(e.target.files);
      }
    },
    [onImagesAdd],
  );

  const handleClearAll = () => {
    images.forEach((img) => onImageRemove(img.id));
  };

  return (
    <div className="space-y-4 min-w-0">
      <Card
        className="relative border-2 border-dashed border-border/60 bg-muted/30 p-6 text-center transition-all duration-200 hover:border-primary/40 hover:bg-muted/50 cursor-pointer group"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition-transform duration-200 group-hover:scale-105">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drag & drop images here
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              or click to browse files
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span className="px-1.5 py-0.5 bg-muted rounded">JPG</span>
            <span className="px-1.5 py-0.5 bg-muted rounded">PNG</span>
            <span className="px-1.5 py-0.5 bg-muted rounded">WebP</span>
            <span className="px-1.5 py-0.5 bg-muted rounded">GIF</span>
            <span className="px-1.5 py-0.5 bg-muted rounded">BMP</span>
            <span className="px-1.5 py-0.5 bg-muted rounded">TIFF</span>
          </div>
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
        <>
          <Separator />

          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Images className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {images.length} image{images.length !== 1 ? "s" : ""}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClearAll}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear all
              </Button>
            </div>

            <div className="h-[280px] rounded-lg border border-border/60 overflow-y-auto overflow-x-hidden">
              <div className="p-2 space-y-1">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className={`group flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all duration-150 ${
                      selectedId === image.id
                        ? "bg-primary/5 border border-primary/20 shadow-sm"
                        : "hover:bg-muted/60 border border-transparent"
                    }`}
                    onClick={() => onImageSelect(image.id)}
                  >
                    <div className="relative w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
                      {image.originalUrl ? (
                        <img
                          src={image.originalUrl}
                          alt={image.metadata.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 m-auto text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {image.metadata.name.replace(/\.[^/.]+$/, "")}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-medium uppercase flex-shrink-0">
                          {image.metadata.name.split(".").pop()?.toLowerCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {image.dimensions.width} × {image.dimensions.height} •{" "}
                        {formatFileSize(image.metadata.size)}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 opacity-50 group-hover:opacity-100 hover:opacity-100 hover:bg-destructive/10 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageRemove(image.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
