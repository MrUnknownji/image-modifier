"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={cn("shrink-0", className)}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#C45B3F" }} />
          <stop offset="50%" style={{ stopColor: "#A84A2F" }} />
          <stop offset="100%" style={{ stopColor: "#8B3D24" }} />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#8B3D24" floodOpacity="0.3" />
        </filter>
      </defs>
      
      {/* Main circular background */}
      <circle cx="256" cy="256" r="240" fill="url(#logoGradient)" opacity="0.1" />
      <circle cx="256" cy="256" r="220" fill="url(#logoGradient)" opacity="0.15" />
      
      {/* Outer decorative ring */}
      <circle cx="256" cy="256" r="200" stroke="url(#logoGradient)" strokeWidth="3" fill="none" opacity="0.4" />
      
      {/* Main image frame container */}
      <rect x="126" y="146" width="260" height="200" rx="20" ry="20" fill="url(#logoGradient)" filter="url(#softShadow)" />
      
      {/* Image content area */}
      <rect x="141" y="161" width="230" height="170" rx="12" ry="12" fill="currentColor" className="text-background" />
      
      {/* Stylized mountain/landscape */}
      <path d="M141 280 L195 215 L255 265 L315 195 L371 260 L371 331 L141 331 Z" fill="url(#logoGradient)" opacity="0.2" />
      <path d="M141 295 L210 235 L280 305 L340 250 L371 285 L371 331 L141 331 Z" fill="url(#logoGradient)" opacity="0.35" />
      
      {/* Sun/moon circle */}
      <circle cx="320" cy="200" r="25" fill="url(#logoGradient)" opacity="0.6" />
      
      {/* Magic wand */}
      <g transform="translate(320, 120) rotate(45)">
        <rect x="-6" y="0" width="12" height="80" rx="6" fill="url(#logoGradient)" />
        <circle cx="0" cy="-8" r="14" fill="url(#logoGradient)" />
        {/* Sparkle stars */}
        <path d="M-20 -25 L-16 -25 L-18 -21 Z" fill="url(#logoGradient)" opacity="0.8" />
        <path d="M20 -30 L16 -30 L18 -26 Z" fill="url(#logoGradient)" opacity="0.6" />
        <path d="M0 -45 L-3 -38 L3 -38 Z" fill="url(#logoGradient)" opacity="0.9" />
        <circle cx="-25" cy="-15" r="2" fill="url(#logoGradient)" opacity="0.7" />
        <circle cx="28" cy="-20" r="1.5" fill="url(#logoGradient)" opacity="0.5" />
      </g>
      
      {/* Bottom accent line */}
      <rect x="156" y="340" width="200" height="4" rx="2" fill="url(#logoGradient)" opacity="0.5" />
    </svg>
  );
}

export function LogoSmall({ className, size = 24 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={cn("shrink-0", className)}
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="logoSmallGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#C45B3F" }} />
          <stop offset="100%" style={{ stopColor: "#8B3D24" }} />
        </linearGradient>
      </defs>
      
      {/* Simplified version for small sizes */}
      <rect x="106" y="126" width="300" height="260" rx="28" fill="url(#logoSmallGradient)" />
      <rect x="126" y="146" width="260" height="220" rx="20" fill="currentColor" className="text-background" />
      <path d="M126 280 L200 200 L280 280 L360 190 L386 220 L386 366 L126 366 Z" fill="url(#logoSmallGradient)" opacity="0.3" />
      <circle cx="340" cy="190" r="35" fill="url(#logoSmallGradient)" opacity="0.6" />
      <g transform="translate(380, 100) rotate(45)">
        <rect x="-8" y="0" width="16" height="80" rx="8" fill="url(#logoSmallGradient)" />
        <circle cx="0" cy="-12" r="18" fill="url(#logoSmallGradient)" />
      </g>
    </svg>
  );
}
