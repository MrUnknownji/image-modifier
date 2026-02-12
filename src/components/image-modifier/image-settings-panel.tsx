'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  RefreshCcw,
  FileImage,
  Settings2,
  Monitor,
  Crop,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  COMMON_ASPECT_RATIOS,
  COMMON_RESOLUTIONS,
  type ProcessedImage,
  type ImageSettings,
  type ImageFilters,
} from '@/types/image';

interface ImageSettingsPanelProps {
  image: ProcessedImage | null;
  onSettingsChange: (settings: ImageSettings) => void;
  onApplyToAll: () => void;
  hasMultipleImages: boolean;
}

export function ImageSettingsPanel({
  image,
  onSettingsChange,
  onApplyToAll,
  hasMultipleImages,
}: ImageSettingsPanelProps) {
  const [settings, setSettings] = useState<ImageSettings>(
    image?.settings || {
      width: 0,
      height: 0,
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
    }
  );
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [lockRatio, setLockRatio] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (image) {
      setSettings(image.settings);
    }
    // Clear any pending debounced updates when image changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [image?.id]);

  const updateSettings = (updates: Partial<ImageSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    // Debounce the parent update to prevent excessive processing
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onSettingsChange(newSettings);
    }, 500);
  };

  const handleWidthChange = (value: string) => {
    const width = parseInt(value) || 0;
    if (lockRatio && settings.maintainAspectRatio && image) {
      const ratio = image.dimensions.height / image.dimensions.width;
      updateSettings({ width, height: Math.round(width * ratio) });
    } else {
      updateSettings({ width });
    }
  };

  const handleHeightChange = (value: string) => {
    const height = parseInt(value) || 0;
    if (lockRatio && settings.maintainAspectRatio && image) {
      const ratio = image.dimensions.width / image.dimensions.height;
      updateSettings({ height, width: Math.round(height * ratio) });
    } else {
      updateSettings({ height });
    }
  };

  const handleAspectRatioChange = (value: string) => {
    const ratio = value === 'null' ? null : parseFloat(value);
    setAspectRatio(ratio);
    
    if (ratio !== null && image) {
      const currentWidth = settings.width || image.dimensions.width;
      const newHeight = Math.round(currentWidth / ratio);
      updateSettings({ height: newHeight });
    }
  };

  const handleResolutionChange = (value: string) => {
    const res = COMMON_RESOLUTIONS.find((r) => r.name === value);
    if (res) {
      if (res.width === 0 && res.height === 0 && image) {
        updateSettings({
          width: image.dimensions.width,
          height: image.dimensions.height,
        });
      } else {
        updateSettings({ width: res.width, height: res.height });
      }
    }
  };

  const handleFilterChange = (key: keyof ImageFilters, value: number) => {
    if (!settings.filters) return;
    updateSettings({
      filters: {
        ...settings.filters,
        [key]: value,
      },
    });
  };

  const resetFilters = () => {
    updateSettings({
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
      },
    });
  };

  const resetToOriginal = () => {
    if (image) {
      updateSettings({
        width: image.dimensions.width,
        height: image.dimensions.height,
      });
      setAspectRatio(null);
    }
  };

  if (!image) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
          <p>Select an image to edit settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 flex-none">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Image Settings
            </CardTitle>
            {hasMultipleImages && (
              <Button variant="outline" size="sm" onClick={onApplyToAll}>
                Apply to All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <Tabs defaultValue="dimensions" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dimensions" className="px-2">
                <Crop className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Size</span>
              </TabsTrigger>
              <TabsTrigger value="filters" className="px-2">
                <Sparkles className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Filters</span>
              </TabsTrigger>
              <TabsTrigger value="quality" className="px-2">
                <Monitor className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Quality</span>
              </TabsTrigger>
              <TabsTrigger value="metadata" className="px-2">
                <FileImage className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Meta</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dimensions" className="space-y-4">
              <div className="space-y-2">
                <Label>Quick Resolution</Label>
                <Select onValueChange={handleResolutionChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select resolution..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_RESOLUTIONS.map((res) => (
                      <SelectItem key={res.name} value={res.name}>
                        {res.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select
                  value={aspectRatio?.toString() ?? 'null'}
                  onValueChange={handleAspectRatioChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ASPECT_RATIOS.map((ratio) => (
                      <SelectItem
                        key={ratio.name}
                        value={ratio.value?.toString() ?? 'null'}
                      >
                        {ratio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Dimensions (px)</Label>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setLockRatio(!lockRatio)}
                        >
                          {lockRatio ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={resetToOriginal}
                        >
                          <RefreshCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset to original</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Width</Label>
                    <Input
                      type="number"
                      value={settings.width || ''}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      placeholder={image.dimensions.width.toString()}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Height</Label>
                    <Input
                      type="number"
                      value={settings.height || ''}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      placeholder={image.dimensions.height.toString()}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="maintain-ratio"
                    checked={settings.maintainAspectRatio}
                    onChange={(e) =>
                      updateSettings({ maintainAspectRatio: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <Label htmlFor="maintain-ratio" className="text-sm cursor-pointer">
                    Maintain aspect ratio
                  </Label>
                </div>
              </div>

              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">
                  Original: {image.dimensions.width} × {image.dimensions.height}
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-6">
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Filters
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Brightness</Label>
                    <span className="text-xs text-muted-foreground">{settings.filters?.brightness}%</span>
                  </div>
                  <Slider
                    value={[settings.filters?.brightness || 100]}
                    onValueChange={([val]) => handleFilterChange('brightness', val)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Contrast</Label>
                    <span className="text-xs text-muted-foreground">{settings.filters?.contrast}%</span>
                  </div>
                  <Slider
                    value={[settings.filters?.contrast || 100]}
                    onValueChange={([val]) => handleFilterChange('contrast', val)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Saturation</Label>
                    <span className="text-xs text-muted-foreground">{settings.filters?.saturation}%</span>
                  </div>
                  <Slider
                    value={[settings.filters?.saturation || 100]}
                    onValueChange={([val]) => handleFilterChange('saturation', val)}
                    min={0}
                    max={200}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Grayscale</Label>
                    <span className="text-xs text-muted-foreground">{settings.filters?.grayscale}%</span>
                  </div>
                  <Slider
                    value={[settings.filters?.grayscale || 0]}
                    onValueChange={([val]) => handleFilterChange('grayscale', val)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Sepia</Label>
                    <span className="text-xs text-muted-foreground">{settings.filters?.sepia}%</span>
                  </div>
                  <Slider
                    value={[settings.filters?.sepia || 0]}
                    onValueChange={([val]) => handleFilterChange('sepia', val)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Blur</Label>
                    <span className="text-xs text-muted-foreground">{settings.filters?.blur}px</span>
                  </div>
                  <Slider
                    value={[settings.filters?.blur || 0]}
                    onValueChange={([val]) => handleFilterChange('blur', val)}
                    min={0}
                    max={20}
                    step={1}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Hue Rotate</Label>
                    <span className="text-xs text-muted-foreground">{settings.filters?.hueRotate}°</span>
                  </div>
                  <Slider
                    value={[settings.filters?.hueRotate || 0]}
                    onValueChange={([val]) => handleFilterChange('hueRotate', val)}
                    min={0}
                    max={360}
                    step={1}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quality" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Output Format</Label>
                </div>
                <Select
                  value={settings.format}
                  onValueChange={(value: 'jpeg' | 'png' | 'webp') =>
                    updateSettings({ format: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {settings.format !== 'png' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Quality</Label>
                    <span className="text-sm text-muted-foreground">
                      {settings.quality}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.quality]}
                    onValueChange={([value]) => updateSettings({ quality: value })}
                    min={1}
                    max={100}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher quality = Larger file size
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>DPI (Resolution)</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.dpi} DPI
                  </span>
                </div>
                <Slider
                  value={[settings.dpi]}
                  onValueChange={([value]) => updateSettings({ dpi: value })}
                  min={72}
                  max={600}
                  step={1}
                />
                <div className="flex gap-2">
                  {[72, 150, 300, 600].map((dpi) => (
                    <Button
                      key={dpi}
                      variant={settings.dpi === dpi ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ dpi })}
                      className="flex-1"
                    >
                      {dpi}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="preserve-metadata"
                    checked={settings.preserveMetadata}
                    onChange={(e) =>
                      updateSettings({ preserveMetadata: e.target.checked })
                    }
                    className="rounded border-border"
                  />
                  <Label htmlFor="preserve-metadata" className="text-sm cursor-pointer">
                    Preserve EXIF metadata
                  </Label>
                </div>

                {image.exif && (
                  <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-1">
                    <p className="font-medium mb-2">Detected EXIF Data:</p>
                    {image.exif.Make && (
                      <p>Camera: {image.exif.Make} {image.exif.Model}</p>
                    )}
                    {image.exif.DateTimeOriginal && (
                      <p>Date: {new Date(image.exif.DateTimeOriginal).toLocaleString()}</p>
                    )}
                    {image.exif.GPSLatitude && image.exif.GPSLongitude && (
                      <p>GPS: Available</p>
                    )}
                    {image.exif.FNumber && (
                      <p>Aperture: f/{image.exif.FNumber}</p>
                    )}
                    {image.exif.ExposureTime && (
                      <p>Shutter: 1/{Math.round(1 / image.exif.ExposureTime)}s</p>
                    )}
                    {image.exif.ISOSpeedRatings && (
                      <p>ISO: {image.exif.ISOSpeedRatings}</p>
                    )}
                    {image.exif.FocalLength && (
                      <p>Focal: {image.exif.FocalLength}mm</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}