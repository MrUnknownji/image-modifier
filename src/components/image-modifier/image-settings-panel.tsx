'use client';

import { useState, useRef, useCallback } from 'react';
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
  Copy,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  COMMON_ASPECT_RATIOS,
  COMMON_RESOLUTIONS,
  FILTER_PRESETS,
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

const DEFAULT_SETTINGS: ImageSettings = {
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
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

const DEFAULT_FILTERS: ImageFilters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  blur: 0,
  hueRotate: 0,
};

interface FilterSliderProps {
  label: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  onReset: () => void;
}

function FilterSlider({ label, value, defaultValue, min, max, step = 1, unit = '%', onChange, onReset }: FilterSliderProps) {
  const handleInputChange = useCallback((inputValue: string) => {
    const parsed = parseInt(inputValue) || 0;
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
  }, [min, max, onChange]);

  const isModified = value !== defaultValue;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            className="h-6 w-14 text-xs text-right px-1.5"
            min={min}
            max={max}
          />
          <span className="text-xs text-muted-foreground w-4">{unit}</span>
          {isModified && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReset}
                  className="h-5 w-5 p-0 hover:bg-muted"
                >
                  <RotateCcw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to default</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

export function ImageSettingsPanel({
  image,
  onSettingsChange,
  onApplyToAll,
  hasMultipleImages,
}: ImageSettingsPanelProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [lockRatio, setLockRatio] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const settings = image?.settings ?? DEFAULT_SETTINGS;

  const updateSettings = (updates: Partial<ImageSettings>) => {
    if (!image) return;
    
    const newSettings = { ...settings, ...updates };
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onSettingsChange(newSettings);
    }, 300);
  };

  const handleWidthChange = (value: string) => {
    const width = Math.max(1, Math.min(16384, parseInt(value) || 0));
    if (lockRatio && settings.maintainAspectRatio && image && image.dimensions.width > 0) {
      const ratio = image.dimensions.height / image.dimensions.width;
      updateSettings({ width, height: Math.round(width * ratio) });
    } else {
      updateSettings({ width });
    }
  };

  const handleHeightChange = (value: string) => {
    const height = Math.max(1, Math.min(16384, parseInt(value) || 0));
    if (lockRatio && settings.maintainAspectRatio && image && image.dimensions.height > 0) {
      const ratio = image.dimensions.width / image.dimensions.height;
      updateSettings({ height, width: Math.round(height * ratio) });
    } else {
      updateSettings({ height });
    }
  };

  const handleAspectRatioChange = (value: string) => {
    const ratio = value === 'null' ? null : parseFloat(value);
    setAspectRatio(ratio);
    
    if (ratio !== null && ratio > 0 && image) {
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

  const handleFilterReset = (key: keyof ImageFilters) => {
    if (!settings.filters) return;
    updateSettings({
      filters: {
        ...settings.filters,
        [key]: DEFAULT_FILTERS[key],
      },
    });
  };

  const handlePresetChange = (presetName: string) => {
    const preset = FILTER_PRESETS.find(p => p.name === presetName);
    if (preset) {
      updateSettings({ filters: { ...preset.filters } });
    }
  };

  const resetFilters = () => {
    updateSettings({ filters: { ...DEFAULT_FILTERS } });
  };

  const resetToOriginal = () => {
    if (image) {
      updateSettings({
        width: image.dimensions.width,
        height: image.dimensions.height,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
      });
      setAspectRatio(null);
    }
  };

  const handleRotate = () => {
    const newRotation = ((settings.rotation || 0) + 90) % 360;
    updateSettings({ rotation: newRotation });
  };

  const handleFlipHorizontal = () => {
    updateSettings({ flipHorizontal: !settings.flipHorizontal });
  };

  const handleFlipVertical = () => {
    updateSettings({ flipVertical: !settings.flipVertical });
  };

  const handleStripExif = () => {
    updateSettings({ preserveMetadata: false });
  };

  const handleQualityChange = (value: string) => {
    const quality = Math.max(1, Math.min(100, parseInt(value) || 85));
    updateSettings({ quality });
  };

  const handleDpiChange = (value: string) => {
    const dpi = Math.max(72, Math.min(600, parseInt(value) || 72));
    updateSettings({ dpi });
  };

  const hasGPS = image?.exif?.GPSLatitude && image?.exif?.GPSLongitude;

  if (!image) {
    return (
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium">Select an image to edit</p>
          <p className="text-xs text-muted-foreground mt-1">Upload images to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 min-w-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Image Settings
          </CardTitle>
          {hasMultipleImages && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={onApplyToAll} className="h-8 gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Apply to All
                </Button>
              </TooltipTrigger>
              <TooltipContent>Apply current settings to all images</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 min-w-0">
        <Tabs defaultValue="dimensions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="dimensions" className="text-xs gap-1.5">
              <Crop className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Size</span>
            </TabsTrigger>
            <TabsTrigger value="filters" className="text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </TabsTrigger>
            <TabsTrigger value="quality" className="text-xs gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quality</span>
            </TabsTrigger>
            <TabsTrigger value="metadata" className="text-xs gap-1.5">
              <FileImage className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Meta</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dimensions" className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Quick Resolution</Label>
              <Select onValueChange={handleResolutionChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select resolution..." />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_RESOLUTIONS.map((res) => (
                    <SelectItem key={res.name} value={res.name} className="text-sm">
                      {res.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Aspect Ratio</Label>
              <Select
                value={aspectRatio?.toString() ?? 'null'}
                onValueChange={handleAspectRatioChange}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select aspect ratio..." />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_ASPECT_RATIOS.map((ratio) => (
                    <SelectItem
                      key={ratio.name}
                      value={ratio.value?.toString() ?? 'null'}
                      className="text-sm"
                    >
                      {ratio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Transform</Label>
              <div className="flex gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotate}
                      className="flex-1 h-8 text-xs gap-1.5"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Rotate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate 90° (Current: {settings.rotation || 0}°)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={settings.flipHorizontal ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleFlipHorizontal}
                      className="flex-1 h-8 text-xs gap-1.5"
                    >
                      <FlipHorizontal className="h-3.5 w-3.5" />
                      Flip H
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Flip horizontally</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={settings.flipVertical ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleFlipVertical}
                      className="flex-1 h-8 text-xs gap-1.5"
                    >
                      <FlipVertical className="h-3.5 w-3.5" />
                      Flip V
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Flip vertically</TooltipContent>
                </Tooltip>
              </div>
              {(settings.rotation !== 0 || settings.flipHorizontal || settings.flipVertical) && (
                <p className="text-[10px] text-muted-foreground">
                  Rotation: {settings.rotation}° • H-Flip: {settings.flipHorizontal ? 'Yes' : 'No'} • V-Flip: {settings.flipVertical ? 'Yes' : 'No'}
                </p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Dimensions (px)</Label>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setLockRatio(!lockRatio)}
                      >
                        {lockRatio ? (
                          <Lock className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={resetToOriginal}
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Reset to original</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Width</Label>
                  <Input
                    type="number"
                    value={settings.width || ''}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    placeholder={image.dimensions.width.toString()}
                    className="h-9 text-sm"
                    min={1}
                    max={16384}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Height</Label>
                  <Input
                    type="number"
                    value={settings.height || ''}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    placeholder={image.dimensions.height.toString()}
                    className="h-9 text-sm"
                    min={1}
                    max={16384}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="maintain-ratio"
                  checked={settings.maintainAspectRatio}
                  onCheckedChange={(checked) =>
                    updateSettings({ maintainAspectRatio: checked as boolean })
                  }
                />
                <Label htmlFor="maintain-ratio" className="text-xs cursor-pointer font-normal">
                  Maintain aspect ratio
                </Label>
              </div>
            </div>

            <div className="pt-2">
              <Badge variant="secondary" className="text-[10px] font-normal">
                Original: {image.dimensions.width} × {image.dimensions.height}
              </Badge>
            </div>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Filter Presets</Label>
              <Select onValueChange={handlePresetChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select a preset..." />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name} className="text-sm">
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Adjust image filters and effects
              </span>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs gap-1.5">
                <RotateCcw className="h-3 w-3" />
                Reset All
              </Button>
            </div>

            <div className="space-y-4">
              <FilterSlider
                label="Brightness"
                value={settings.filters?.brightness ?? 100}
                defaultValue={100}
                min={0}
                max={200}
                onChange={(v) => handleFilterChange('brightness', v)}
                onReset={() => handleFilterReset('brightness')}
              />

              <FilterSlider
                label="Contrast"
                value={settings.filters?.contrast ?? 100}
                defaultValue={100}
                min={0}
                max={200}
                onChange={(v) => handleFilterChange('contrast', v)}
                onReset={() => handleFilterReset('contrast')}
              />

              <FilterSlider
                label="Saturation"
                value={settings.filters?.saturation ?? 100}
                defaultValue={100}
                min={0}
                max={200}
                onChange={(v) => handleFilterChange('saturation', v)}
                onReset={() => handleFilterReset('saturation')}
              />

              <FilterSlider
                label="Grayscale"
                value={settings.filters?.grayscale ?? 0}
                defaultValue={0}
                min={0}
                max={100}
                onChange={(v) => handleFilterChange('grayscale', v)}
                onReset={() => handleFilterReset('grayscale')}
              />

              <FilterSlider
                label="Sepia"
                value={settings.filters?.sepia ?? 0}
                defaultValue={0}
                min={0}
                max={100}
                onChange={(v) => handleFilterChange('sepia', v)}
                onReset={() => handleFilterReset('sepia')}
              />

              <FilterSlider
                label="Blur"
                value={settings.filters?.blur ?? 0}
                defaultValue={0}
                min={0}
                max={20}
                unit="px"
                onChange={(v) => handleFilterChange('blur', v)}
                onReset={() => handleFilterReset('blur')}
              />

              <FilterSlider
                label="Hue Rotate"
                value={settings.filters?.hueRotate ?? 0}
                defaultValue={0}
                min={0}
                max={360}
                unit="°"
                onChange={(v) => handleFilterChange('hueRotate', v)}
                onReset={() => handleFilterReset('hueRotate')}
              />
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Output Format</Label>
              <Select
                value={settings.format}
                onValueChange={(value: 'jpeg' | 'png' | 'webp') =>
                  updateSettings({ format: value })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpeg" className="text-sm">JPEG</SelectItem>
                  <SelectItem value="png" className="text-sm">PNG</SelectItem>
                  <SelectItem value="webp" className="text-sm">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {settings.format !== 'png' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Quality</Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      value={settings.quality}
                      onChange={(e) => handleQualityChange(e.target.value)}
                      className="h-6 w-14 text-xs text-right px-1.5"
                      min={1}
                      max={100}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    {settings.quality !== 85 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateSettings({ quality: 85 })}
                        className="h-5 w-5 p-0 hover:bg-muted"
                      >
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
                <Slider
                  value={[settings.quality]}
                  onValueChange={([value]) => updateSettings({ quality: value })}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground">
                  Higher quality results in larger file size
                </p>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">DPI (Resolution)</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={settings.dpi}
                    onChange={(e) => handleDpiChange(e.target.value)}
                    className="h-6 w-14 text-xs text-right px-1.5"
                    min={72}
                    max={600}
                  />
                  <span className="text-xs text-muted-foreground">DPI</span>
                  {settings.dpi !== 72 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateSettings({ dpi: 72 })}
                      className="h-5 w-5 p-0 hover:bg-muted"
                    >
                      <RotateCcw className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
              <Slider
                value={[settings.dpi]}
                onValueChange={([value]) => updateSettings({ dpi: value })}
                min={72}
                max={600}
                step={1}
                className="w-full"
              />
              <div className="flex gap-1.5">
                {[72, 150, 300, 600].map((dpi) => (
                  <Button
                    key={dpi}
                    variant={settings.dpi === dpi ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSettings({ dpi })}
                    className="flex-1 h-7 text-xs"
                  >
                    {dpi}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4 mt-2">
            {hasGPS && settings.preserveMetadata && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <MapPin className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs">
                  <span className="font-medium">GPS data detected!</span>
                  <br />
                  This image contains location data. Consider removing metadata before sharing.
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleStripExif}
                    className="h-auto p-0 ml-1 text-amber-600 dark:text-amber-400"
                  >
                    Remove metadata
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="preserve-metadata"
                  checked={settings.preserveMetadata}
                  onCheckedChange={(checked) =>
                    updateSettings({ preserveMetadata: checked as boolean })
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="preserve-metadata" className="text-xs font-medium cursor-pointer">
                    Preserve EXIF metadata
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Keep camera info, GPS, and other metadata in the output
                  </p>
                </div>
              </div>

              {!settings.preserveMetadata && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-md border border-green-500/30">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">Metadata will be removed from output</span>
                </div>
              )}

              {image.exif && Object.keys(image.exif).length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/60">
                  <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5">
                    <FileImage className="h-3.5 w-3.5 text-primary" />
                    Detected EXIF Data
                  </p>
                  <div className="space-y-1.5 text-[10px] text-muted-foreground">
                    {image.exif.Make && (
                      <p><span className="text-foreground/70">Camera:</span> {image.exif.Make} {image.exif.Model}</p>
                    )}
                    {image.exif.DateTimeOriginal && (
                      <p><span className="text-foreground/70">Date:</span> {new Date(image.exif.DateTimeOriginal).toLocaleString()}</p>
                    )}
                    {hasGPS && (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-amber-500" />
                        <span className="text-foreground/70">GPS:</span> Location data detected
                      </p>
                    )}
                    {image.exif.FNumber && (
                      <p><span className="text-foreground/70">Aperture:</span> f/{image.exif.FNumber}</p>
                    )}
                    {image.exif.ExposureTime && (
                      <p><span className="text-foreground/70">Shutter:</span> 1/{Math.round(1 / image.exif.ExposureTime)}s</p>
                    )}
                    {image.exif.ISOSpeedRatings && (
                      <p><span className="text-foreground/70">ISO:</span> {image.exif.ISOSpeedRatings}</p>
                    )}
                    {image.exif.FocalLength && (
                      <p><span className="text-foreground/70">Focal:</span> {image.exif.FocalLength}mm</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
