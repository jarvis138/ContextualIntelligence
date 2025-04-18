import React from 'react';
import colors from '@/styles/colors';

interface NovexaLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function NovexaLogo({ className = "h-10 w-auto", variant = 'light' }: NovexaLogoProps) {
  // Colors for the hexagon logo
  const lightBlue1 = '#94B0FF'; // Light blue for first hexagon
  const lightBlue2 = '#7998FF'; // Light blue for second hexagon
  const lightBlue3 = '#5B80FF'; // Light blue for third hexagon
  const brightBlue = '#3F8BFF'; // Bright blue for the main hexagon
  
  // Text color (adapts to context based on variant)
  const textColor = variant === 'light' ? '#0B4C79' : '#FFFFFF'; // Primary blue or white

  return (
    <svg 
      width="240" 
      height="40" 
      viewBox="0 0 240 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Hexagon cluster logo */}
      <g transform="translate(0, 2)">
        {/* First hexagon (top left) */}
        <path d="M12 8L19 12V20L12 24L5 20V12L12 8Z" fill={lightBlue1} />
        
        {/* Second hexagon (middle left) */}
        <path d="M24 8L31 12V20L24 24L17 20V12L24 8Z" fill={lightBlue2} />
        
        {/* Third hexagon (top right) */}
        <path d="M18 20L25 24V32L18 36L11 32V24L18 20Z" fill={lightBlue3} />
        
        {/* Main hexagon (bottom right) */}
        <path d="M30 20L37 24V32L30 36L23 32V24L30 20Z" fill={brightBlue} />
      </g>
      
      {/* NOVEXA text - primary blue color */}
      <g transform="translate(60, 5)">
        {/* N */}
        <path d="M0 0V27H8V0H0ZM8 0L25 13.5L8 27" fill={textColor}/>
        
        {/* O */}
        <path d="M35 0C43 0 49 6 49 13.5C49 21 43 27 35 27C27 27 21 21 21 13.5C21 6 27 0 35 0ZM35 7C31 7 28 10 28 13.5C28 17 31 20 35 20C39 20 42 17 42 13.5C42 10 39 7 35 7Z" fill={textColor}/>
        
        {/* V */}
        <path d="M55 0H63L75 24L87 0H95L77 28H73L55 0Z" fill={textColor}/>
        
        {/* E */}
        <path d="M100 0H125V6H108V11H125V16H108V21H125V27H100V0Z" fill={textColor}/>
        
        {/* X */}
        <path d="M130 0H140L150 10L160 0H170L155 13.5L170 27H160L150 17L140 27H130L145 13.5L130 0Z" fill={textColor}/>
        
        {/* A */}
        <path d="M175 0H183L198 27H190L187 21H171L168 27H160L175 0ZM179 7L173 15H185L179 7Z" fill={textColor}/>
      </g>
    </svg>
  );
}