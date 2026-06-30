# AuraEdit

AuraEdit is a privacy-first image editor that runs entirely in the browser. It resizes, converts, filters, rotates, flips, and batch-processes JPG, PNG, WebP, GIF, and BMP images without uploading files to a server.

## Local development

Requirements: Node.js 20.9 or newer.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

## Production notes

- `npm run build` creates a static export in `dist/`.
- Image files are limited to approved raster MIME types, 25 MB per file, 50 images per session, 8192 px per side, and 64 megapixels.
- Exports are re-encoded with Canvas and do not retain EXIF metadata.
- Heavy EXIF and ZIP libraries are loaded only when those workflows need them.
- Security headers are included for Vercel (`vercel.json`) and `_headers`-compatible static hosts (`public/_headers`).
