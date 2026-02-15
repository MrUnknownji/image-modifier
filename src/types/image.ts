export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageMetadata {
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

export interface EXIFData {
  Make?: string;
  Model?: string;
  DateTimeOriginal?: string;
  ExposureTime?: number;
  FNumber?: number;
  ISOSpeedRatings?: number;
  FocalLength?: number;
  GPSLatitude?: number[];
  GPSLongitude?: number[];
  ImageWidth?: number;
  ImageHeight?: number;
  Orientation?: number;
  Software?: string;
  Copyright?: string;
  Artist?: string;
  [key: string]: unknown;
}

export interface ProcessedImage {
  id: string;
  originalFile: File;
  originalUrl: string;
  processedUrl: string | null;
  metadata: ImageMetadata;
  dimensions: ImageDimensions;
  exif: EXIFData | null;
  settings: ImageSettings;
}

export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
  hueRotate: number;
}

export interface ImageSettings {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  dpi: number;
  preserveMetadata: boolean;
  filters: ImageFilters;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface HistoryState {
  settings: ImageSettings;
  timestamp: number;
  action: string;
}

export interface ProcessedImage {
  id: string;
  originalFile: File;
  originalUrl: string;
  processedUrl: string | null;
  metadata: ImageMetadata;
  dimensions: ImageDimensions;
  exif: EXIFData | null;
  settings: ImageSettings;
  history: HistoryState[];
  historyIndex: number;
}

export interface FilterPreset {
  name: string;
  filters: ImageFilters;
}

export interface AspectRatio {
  name: string;
  value: number | null;
  dimensions?: { width: number; height: number };
}

export const COMMON_ASPECT_RATIOS: AspectRatio[] = [
  { name: 'Original', value: null },
  { name: '1:1 (Square)', value: 1 },
  { name: '4:3 (Standard)', value: 4 / 3 },
  { name: '16:9 (Widescreen)', value: 16 / 9 },
  { name: '3:2 (Photo)', value: 3 / 2 },
  { name: '21:9 (Ultrawide)', value: 21 / 9 },
  { name: '9:16 (Portrait)', value: 9 / 16 },
  { name: '5:4 (Large Format)', value: 5 / 4 },
];

export const FILTER_PRESETS: FilterPreset[] = [
  { 
    name: 'Original', 
    filters: { brightness: 100, contrast: 100, saturation: 100, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 }
  },
  { 
    name: 'Vintage', 
    filters: { brightness: 105, contrast: 90, saturation: 80, grayscale: 0, sepia: 30, blur: 0, hueRotate: 0 }
  },
  { 
    name: 'Dramatic', 
    filters: { brightness: 100, contrast: 130, saturation: 120, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 }
  },
  { 
    name: 'B&W', 
    filters: { brightness: 100, contrast: 110, saturation: 0, grayscale: 100, sepia: 0, blur: 0, hueRotate: 0 }
  },
  { 
    name: 'Warm', 
    filters: { brightness: 105, contrast: 100, saturation: 110, grayscale: 0, sepia: 15, blur: 0, hueRotate: 0 }
  },
  { 
    name: 'Cool', 
    filters: { brightness: 100, contrast: 105, saturation: 105, grayscale: 0, sepia: 0, blur: 0, hueRotate: 200 }
  },
  { 
    name: 'Faded', 
    filters: { brightness: 110, contrast: 85, saturation: 90, grayscale: 0, sepia: 10, blur: 0, hueRotate: 0 }
  },
  { 
    name: 'Vivid', 
    filters: { brightness: 105, contrast: 115, saturation: 140, grayscale: 0, sepia: 0, blur: 0, hueRotate: 0 }
  },
];

export const COMMON_RESOLUTIONS = [
  { name: 'Original', width: 0, height: 0 },
  { name: 'HD (1280×720)', width: 1280, height: 720 },
  { name: 'Full HD (1920×1080)', width: 1920, height: 1080 },
  { name: '2K (2560×1440)', width: 2560, height: 1440 },
  { name: '4K (3840×2160)', width: 3840, height: 2160 },
  { name: '8K (7680×4320)', width: 7680, height: 4320 },
  { name: 'Instagram Post (1080×1080)', width: 1080, height: 1080 },
  { name: 'Instagram Story (1080×1920)', width: 1080, height: 1920 },
  { name: 'Facebook Cover (820×312)', width: 820, height: 312 },
  { name: 'Twitter Header (1500×500)', width: 1500, height: 500 },
  { name: 'YouTube Thumbnail (1280×720)', width: 1280, height: 720 },
];
export const MAX_IMAGE_DIMENSION = 16384;
