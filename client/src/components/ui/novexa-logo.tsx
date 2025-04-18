import React from 'react';
import colors from '@/styles/colors';

interface NovexaLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export function NovexaLogo({ className = "h-10 w-auto", variant = 'light' }: NovexaLogoProps) {
  // Colors to match the image exactly
  const lightBlue = '#94b0ff'; // Light blue for top left hexagon
  const mediumBlue = '#6a8dff'; // Medium blue for top right hexagon
  const brightBlue = '#3f8bff'; // Bright blue for bottom right hexagon (main)
  const brandBlue = '#0B4C79'; // Primary brand blue color
  
  // Text color based on variant
  const textColor = variant === 'light' ? '#FFFFFF' : '#FFFFFF'; // White in both cases as shown in the image

  return (
    <svg 
      width="240" 
      height="40" 
      viewBox="0 0 240 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Create a gradient blue background similar to the image */}
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0039aa" />
          <stop offset="100%" stopColor="#0077ff" />
        </linearGradient>
      </defs>
      
      {/* Background rectangle with rounded corners */}
      <rect x="0" y="0" width="240" height="40" rx="4" fill="url(#blueGradient)" />
      
      {/* Hexagon cluster logo - positioned exactly as in the reference image */}
      <g transform="translate(9, 5) scale(0.7)">
        {/* First hexagon (top left) */}
        <path d="M12 8L19 12V20L12 24L5 20V12L12 8Z" fill={lightBlue} />
        
        {/* Second hexagon (top right) - positioned to connect with first */}
        <path d="M24 8L31 12V20L24 24L17 20V12L24 8Z" fill={mediumBlue} />
        
        {/* Third hexagon (bottom left) - positioned to connect with first */}
        <path d="M18 20L25 24V32L18 36L11 32V24L18 20Z" fill={mediumBlue} />
        
        {/* Main hexagon (bottom right) - positioned to connect with all others */}
        <path d="M30 20L37 24V32L30 36L23 32V24L30 20Z" fill={brightBlue} />
      </g>
      
      {/* NOVEXA text - white bold text as shown in the image */}
      <g transform="translate(60, 7)">
        {/* N */}
        <path d="M0 0V24H7V0H0ZM7 0L22 12L7 24" fill={textColor} style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.2))' }}/>
        
        {/* O */}
        <path d="M32 0C40 0 46 6 46 12C46 18 40 24 32 24C24 24 18 18 18 12C18 6 24 0 32 0ZM32 6C28 6 25 8.5 25 12C25 15.5 28 18 32 18C36 18 39 15.5 39 12C39 8.5 36 6 32 6Z" fill={textColor} style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.2))' }}/>
        
        {/* V */}
        <path d="M52 0H60L70 20L80 0H88L73 25H67L52 0Z" fill={textColor} style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.2))' }}/>
        
        {/* E */}
        <path d="M95 0H120V5H102V9.5H120V14.5H102V19H120V24H95V0Z" fill={textColor} style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.2))' }}/>
        
        {/* X */}
        <path d="M127 0H135L145 9L155 0H163L148 12L163 24H155L145 15L135 24H127L142 12L127 0Z" fill={textColor} style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.2))' }}/>
        
        {/* A */}
        <path d="M170 0H178L193 24H185L182 18H166L163 24H155L170 0ZM174 6L168 14H180L174 6Z" fill={textColor} style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.2))' }}/>
      </g>
    </svg>
  );
}