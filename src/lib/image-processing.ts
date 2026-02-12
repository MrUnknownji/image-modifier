import type { ImageDimensions, ImageSettings, EXIFData, ProcessedImage } from '@/types/image';
import exifr from 'exifr';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export async function extractEXIF(file: File): Promise<EXIFData | null> {
  try {
    const exif = await exifr.parse(file, [
      'Make',
      'Model',
      'DateTimeOriginal',
      'ExposureTime',
      'FNumber',
      'ISOSpeedRatings',
      'FocalLength',
      'GPSLatitude',
      'GPSLongitude',
      'ImageWidth',
      'ImageHeight',
      'Orientation',
      'Software',
      'Copyright',
      'Artist',
    ]);
    return exif || null;
  } catch {
    return null;
  }
}

export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  settings: ImageSettings,
  aspectRatio: number | null
): ImageDimensions {
  let { width, height, maintainAspectRatio } = settings;

  if (aspectRatio !== null && maintainAspectRatio) {
    const originalRatio = originalWidth / originalHeight;
    
    if (width && !height) {
      height = Math.round(width / aspectRatio);
    } else if (height && !width) {
      width = Math.round(height * aspectRatio);
    } else if (width && height) {
      const targetRatio = width / height;
      if (Math.abs(targetRatio - aspectRatio) > 0.01) {
        if (width / aspectRatio <= height) {
          height = Math.round(width / aspectRatio);
        } else {
          width = Math.round(height * aspectRatio);
        }
      }
    }
  }

  if (!width && !height) {
    return { width: originalWidth, height: originalHeight };
  }

  if (maintainAspectRatio) {
    const ratio = originalWidth / originalHeight;
    if (width && !height) {
      height = Math.round(width / ratio);
    } else if (height && !width) {
      width = Math.round(height * ratio);
    }
  }

  return { width: width || originalWidth, height: height || originalHeight };
}

export async function processImage(
  image: ProcessedImage,
  aspectRatio: number | null
): Promise<Blob> {
  const { originalFile, dimensions: originalDimensions, settings } = image;
  
  const targetDimensions = calculateDimensions(
    originalDimensions.width,
    originalDimensions.height,
    settings,
    aspectRatio
  );

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetDimensions.width;
      canvas.height = targetDimensions.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Apply filters
      const { brightness, contrast, saturation, grayscale, sepia, blur, hueRotate } = settings.filters;
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px) hue-rotate(${hueRotate}deg)`;

      if (aspectRatio !== null && settings.maintainAspectRatio) {
        const originalRatio = originalDimensions.width / originalDimensions.height;
        const targetRatio = targetDimensions.width / targetDimensions.height;
        
        let sx = 0, sy = 0, sWidth = originalDimensions.width, sHeight = originalDimensions.height;
        
        if (originalRatio > targetRatio) {
          sWidth = originalDimensions.height * targetRatio;
          sx = (originalDimensions.width - sWidth) / 2;
        } else {
          sHeight = originalDimensions.width / targetRatio;
          sy = (originalDimensions.height - sHeight) / 2;
        }
        
        ctx.drawImage(
          img,
          sx, sy, sWidth, sHeight,
          0, 0, targetDimensions.width, targetDimensions.height
        );
      } else {
        ctx.drawImage(img, 0, 0, targetDimensions.width, targetDimensions.height);
      }

      const mimeType = `image/${settings.format}`;
      const quality = settings.format === 'png' ? undefined : settings.quality / 100;
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(originalFile);
  });
}

export function downloadImage(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function createProcessedImage(file: File): Promise<ProcessedImage> {
  const [dimensions, exif] = await Promise.all([
    getImageDimensions(file),
    extractEXIF(file),
  ]);

  return {
    id: generateId(),
    originalFile: file,
    originalUrl: URL.createObjectURL(file),
    processedUrl: null,
    metadata: {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    },
    dimensions,
    exif,
    settings: {
      width: dimensions.width,
      height: dimensions.height,
      maintainAspectRatio: true,
      quality: 85,
      format: 'jpeg',
      dpi: 72,
      preserveMetadata: true,
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    },
  };
}
