import React from 'react';
import { useTheme } from '@/components/ThemeProvider';
import logoLight from '@/assets/logo.png';
import logoDark from '@/assets/logo2.png';

interface LogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ width = 180, height = 'auto', className }) => {
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? logoDark : logoLight;

  return (
    <img
      src={logoSrc}
      alt="Logo Metalma Inox & Cia"
      width={width}
      height={height}
      className={`${className || ''} object-contain`}
      style={{ 
        maxWidth: '100%', 
        height: height === 'auto' ? 'auto' : height,
        display: 'block'
      }}
    />
  );
}; 