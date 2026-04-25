"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 40 }: LogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Aura Effect */}
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-md animate-pulse" />
      <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-125" />
      
      {/* Main Logo Body */}
      <div className="absolute inset-0 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
        {/* Decorative inner glow */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-1/2 h-1/2 text-primary-foreground relative z-10"
        >
          {/* Stylized 'A' that also looks like a lens/edit tool */}
          <path d="M12 4L4 20" />
          <path d="M12 4L20 20" />
          <path d="M8 14H16" />
          <circle cx="12" cy="12" r="3" className="opacity-40" />
        </svg>
      </div>
    </div>
  );
}

export function LogoSmall({ className, size = 24 }: LogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <div className="absolute inset-0 bg-primary rounded-lg flex items-center justify-center shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-1/2 h-1/2 text-primary-foreground"
        >
          <path d="M12 4L4 20" />
          <path d="M12 4L20 20" />
          <path d="M8 14H16" />
        </svg>
      </div>
    </div>
  );
}
