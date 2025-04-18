import React from 'react';
import colors from '@/styles/colors';

interface NovexaLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function NovexaLogo({ className = "h-10 w-auto", variant = 'light' }: NovexaLogoProps) {
  // Text color based on variant
  const textColor = variant === 'light' ? '#0B4C79' : '#FFFFFF';

  return (
    <div className={`font-bold ${className} flex items-center`} style={{ 
      color: textColor, 
      fontSize: '1.75rem',
      letterSpacing: '0.05em',
      fontWeight: 700
    }}>
      NOVEXA
    </div>
  );
}