import React from 'react';

interface NovexaLogoProps {
  className?: string;
}

export function NovexaLogo({ className = "h-10 w-auto" }: NovexaLogoProps) {
  return (
    <svg 
      width="140" 
      height="40" 
      viewBox="0 0 140 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      {/* Icon/logo mark */}
      <rect x="0" y="0" width="40" height="40" rx="6" fill="#001F3F"/>
      <path d="M12 12L24 20L12 28V12Z" fill="#00CED1" />
      
      {/* NOVEXA text */}
      <path d="M48 10H54L54 30H48V10ZM54 10L65 20L54 30" stroke="#001F3F" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M67 10H73C81 10 81 30 73 30H67V10Z" stroke="#001F3F" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M85 10H91L91 21L102 10H109L96 22L109 30H102L91 21V30H85V10Z" stroke="#001F3F" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M111 10H118L125 20L132 10H139L128 26V30H122V26L111 10Z" stroke="#001F3F" strokeWidth="3" strokeLinejoin="round"/>
    </svg>
  );
}