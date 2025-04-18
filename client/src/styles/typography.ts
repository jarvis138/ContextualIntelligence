/**
 * Novexa Design System Typography
 * Based on UI/UX requirements document
 */

export const typography = {
  fontFamily: {
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    monospace: "'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
  },
  
  // Header sizes
  headings: {
    h1: {
      fontSize: '30px',
      lineHeight: '38px',
      fontWeight: 700,
    },
    h2: {
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: 600,
    },
    h3: {
      fontSize: '20px',
      lineHeight: '28px',
      fontWeight: 600,
    },
    h4: {
      fontSize: '18px',
      lineHeight: '26px',
      fontWeight: 500,
    },
    h5: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 500,
    }
  },
  
  // Body text
  body: {
    regular: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 400,
    },
    small: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400,
    },
    caption: {
      fontSize: '12px',
      lineHeight: '16px',
      fontWeight: 400,
    },
  },
  
  // Font weights
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  }
};

// Helper function to generate tailwind-compatible classes
export const generateTypographyClasses = () => {
  return {
    // Heading styles
    'h1': `${typography.headings.h1.fontSize} ${typography.headings.h1.lineHeight} font-${typography.headings.h1.fontWeight}`,
    'h2': `${typography.headings.h2.fontSize} ${typography.headings.h2.lineHeight} font-${typography.headings.h2.fontWeight}`,
    'h3': `${typography.headings.h3.fontSize} ${typography.headings.h3.lineHeight} font-${typography.headings.h3.fontWeight}`,
    'h4': `${typography.headings.h4.fontSize} ${typography.headings.h4.lineHeight} font-${typography.headings.h4.fontWeight}`,
    'h5': `${typography.headings.h5.fontSize} ${typography.headings.h5.lineHeight} font-${typography.headings.h5.fontWeight}`,
    
    // Body styles
    'body': `${typography.body.regular.fontSize} ${typography.body.regular.lineHeight} font-${typography.body.regular.fontWeight}`,
    'body-small': `${typography.body.small.fontSize} ${typography.body.small.lineHeight} font-${typography.body.small.fontWeight}`,
    'caption': `${typography.body.caption.fontSize} ${typography.body.caption.lineHeight} font-${typography.body.caption.fontWeight}`,
  };
};

export default typography;