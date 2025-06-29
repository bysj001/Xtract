export const colors = {
  // Primary colors matching desktop app
  primary: '#4ecdc4',
  primaryDark: '#44a08d',
  secondary: '#ff6b6b',
  secondaryLight: '#ff8e8e',
  accent: '#7b68ee',
  
  // Background colors
  background: '#0f0f0f',
  backgroundLight: '#1a1a1a',
  backgroundCard: 'rgba(30, 30, 30, 0.9)',
  backgroundOverlay: 'rgba(10, 10, 10, 0.8)',
  surface: '#2a2a2a',
  
  // Text colors
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: '#888888',
  
  // Gradient colors
  gradientPrimary: ['#ff6b6b', '#4ecdc4'],
  gradientSecondary: ['#4ecdc4', '#44a08d'],
  gradientAccent: ['#ff6b6b', '#4ecdc4', '#7b68ee'],
  gradientBackground: [
    'rgba(120, 119, 198, 0.3)',
    'rgba(255, 107, 107, 0.3)',
    'rgba(78, 205, 196, 0.2)',
  ],
  
  // Status colors
  success: '#4ecdc4',
  error: '#ff6b6b',
  warning: '#feca57',
  info: '#48dbfb',
  
  // Border colors
  border: 'rgba(255, 255, 255, 0.1)',
  borderActive: '#4ecdc4',
  
  // Shadow colors
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowLight: 'rgba(0, 0, 0, 0.1)',
  
  // Transparent colors
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Utility function to safely add transparency to colors
export const addTransparency = (color: string, transparency: string): string => {
  if (!color || typeof color !== 'string') {
    console.warn('Invalid color provided to addTransparency:', color);
    return 'rgba(0, 0, 0, 0.1)'; // fallback color
  }
  
  // If color already includes transparency, return as is
  if (color.includes('rgba(') || color.includes('hsla(')) {
    return color;
  }
  
  // Convert hex to rgba
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const alpha = parseInt(transparency, 16) / 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // For other color formats, fallback to concatenation
  return color + transparency;
};

// Pre-defined transparent variants for common usage
export const transparentColors = {
  primary10: addTransparency(colors.primary, '10'),
  primary20: addTransparency(colors.primary, '20'),
  primary30: addTransparency(colors.primary, '30'),
  primary50: addTransparency(colors.primary, '50'),
  secondary10: addTransparency(colors.secondary, '10'),
  secondary20: addTransparency(colors.secondary, '20'),
  secondary30: addTransparency(colors.secondary, '30'),
  surface20: addTransparency(colors.surface, '20'),
  surface40: addTransparency(colors.surface, '40'),
  textSecondary30: addTransparency(colors.textSecondary, '30'),
  textSecondary50: addTransparency(colors.textSecondary, '50'),
}; 