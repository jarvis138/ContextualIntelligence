import React from 'react';

interface NovexaLogoProps {
  className?: string;
}

export function NovexaLogo({ className = "h-10 w-auto" }: NovexaLogoProps) {
  return (
    <svg 
      width="240" 
      height="40" 
      viewBox="0 0 240 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Icon - N in rounded square */}
      <rect x="0" y="0" width="40" height="40" rx="8" fill="#001F3F"/>
      <path d="M10 8L10 32L18 32L30 16L30 32L22 32L22 8L30 8L18 24L18 8L10 8Z" fill="#00CED1"/>
      
      {/* NOVEXA text */}
      <path d="M55 8V32H63V8H55ZM63 8L80 20L63 32" fill="#001F3F"/>
      <path d="M90 8C98 8 104 14 104 20C104 26 98 32 90 32C82 32 76 26 76 20C76 14 82 8 90 8ZM90 15C86 15 83 17 83 20C83 23 86 25 90 25C94 25 97 23 97 20C97 17 94 15 90 15Z" fill="#001F3F"/>
      <path d="M110 8H118V17L130 8H140L125 20L140 32H130L118 23V32H110V8Z" fill="#001F3F"/>
      <path d="M145 8H153L165 24L177 8H185L165 36H157L165 26L145 8Z" fill="#001F3F"/>
      <path d="M195 8H220L220 15H203V17H220V24H203V25H220V32H195V8Z" fill="#001F3F"/>
    </svg>
  );
}