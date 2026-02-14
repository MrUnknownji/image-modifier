import type { ImageDimensions, ImageSettings, EXIFData, ProcessedImage } from '@/types/image';
import exifr from 'exifr';

export function generateId(): string {
  return `${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).substr(2, 9)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // Fallback to Image object if createImageBitmap fails
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = blobUrl;
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
  let { width, height } = settings;
  const { maintainAspectRatio } = settings;

  if (aspectRatio !== null && maintainAspectRatio) {

    
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
  aspectRatio: number | null,
  signal?: AbortSignal
): Promise<Blob> {
  const { originalFile, dimensions: originalDimensions, settings } = image;
  
  const targetDimensions = calculateDimensions(
    originalDimensions.width,
    originalDimensions.height,
    settings,
    aspectRatio
  );

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Processing aborted'));
      return;
    }

    const img = new Image();
    const blobUrl = URL.createObjectURL(originalFile);
    
    const abortHandler = () => {
      URL.revokeObjectURL(blobUrl);
      img.src = '';
      reject(new Error('Processing aborted'));
    };
    
    signal?.addEventListener('abort', abortHandler);
    
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      signal?.removeEventListener('abort', abortHandler);
      
      if (signal?.aborted) {
        reject(new Error('Processing aborted'));
        return;
      }

      const { rotation = 0, flipHorizontal = false, flipVertical = false } = settings;
      const radians = (rotation * Math.PI) / 180;
      
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const rotatedWidth = Math.ceil(targetDimensions.width * cos + targetDimensions.height * sin);
      const rotatedHeight = Math.ceil(targetDimensions.width * sin + targetDimensions.height * cos);
      
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.min(16384, rotatedWidth));
      canvas.height = Math.max(1, Math.min(16384, rotatedHeight));
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const { brightness = 100, contrast = 100, saturation = 100, grayscale = 0, sepia = 0, blur = 0, hueRotate = 0 } = settings.filters || {};
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px) hue-rotate(${hueRotate}deg)`;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

      if (aspectRatio !== null && settings.maintainAspectRatio) {
        const originalRatio = originalDimensions.width / originalDimensions.height;
        const targetRatio = targetDimensions.width / targetDimensions.height;
        
        let sx = 0, sy = 0, sWidth = originalDimensions.width, sHeight = originalDimensions.height;
        
        if (originalRatio > targetRatio) {
          sWidth = originalDimensions.height * targetRatio;
          sx = (originalDimensions.width - sWidth) / 2;
        } else if (targetRatio > 0) {
          sHeight = originalDimensions.width / targetRatio;
          sy = (originalDimensions.height - sHeight) / 2;
        }
        
        ctx.drawImage(
          img,
          sx, sy, sWidth, sHeight,
          -targetDimensions.width / 2, -targetDimensions.height / 2, targetDimensions.width, targetDimensions.height
        );
      } else {
        ctx.drawImage(img, -targetDimensions.width / 2, -targetDimensions.height / 2, targetDimensions.width, targetDimensions.height);
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
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      signal?.removeEventListener('abort', abortHandler);
      reject(new Error('Failed to load image'));
    };
    img.src = blobUrl;
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

  const settings: ImageSettings = {
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
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
  };

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
    settings,
    history: [{ settings: { ...settings }, timestamp: Date.now(), action: 'Initial' }],
    historyIndex: 0,
  };
}
