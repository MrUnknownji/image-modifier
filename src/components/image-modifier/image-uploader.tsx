"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="space-y-3 w-full max-w-full">
      <Card
        className="relative border-2 border-dashed border-primary/20 bg-primary/5 p-8 text-center transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 cursor-pointer group w-full max-w-full rounded-2xl"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-110">
            <Upload className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">
              Drag & drop images here
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              or click to browse
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold tracking-wider">
            {["JPG", "PNG", "WEBP", "GIF", "BMP", "TIFF"].map((ext) => (
              <span key={ext} className="px-2 py-1 bg-background/50 rounded-md border border-border/50">
                {ext}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60 font-medium pt-2">Max file size: 25MB per image</p>
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
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-foreground">
                {images.length} Loaded Image{images.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-[10px] font-bold uppercase tracking-wider text-destructive hover:text-destructive hover:bg-destructive/5 rounded-full"
              onClick={handleClearAll}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
            <AnimatePresence initial={false}>
              {images.map((image) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`group flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 border ${
                    selectedId === image.id
                      ? "bg-primary/5 border-primary/30 shadow-sm"
                      : "bg-background border-border/50 hover:border-primary/20 hover:bg-muted/30"
                  }`}
                  onClick={() => onImageSelect(image.id)}
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                    {image.originalUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={image.originalUrl}
                        alt={image.metadata.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 m-auto text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-[11px] font-bold truncate text-foreground">
                        {image.metadata.name.replace(/\.[^/.]+$/, "")}
                      </p>
                      <span className="text-[8px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md font-bold uppercase flex-shrink-0">
                        {image.metadata.name.split(".").pop()?.toLowerCase()}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium truncate">
                      {image.dimensions.width}×{image.dimensions.height} • {formatFileSize(image.metadata.size)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded-full transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageRemove(image.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground group-hover:text-destructive" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
