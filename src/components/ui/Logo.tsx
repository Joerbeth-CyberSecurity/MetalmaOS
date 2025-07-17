import React from 'react';
import logoLight from '@/assets/logo.png';

interface LogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ width = 180, height = 'auto', className }) => {
  return (
    <img
      src={logoLight}
      alt="Logo Metalma Inox & Cia"
      width={width}
      height={height}
      className={className}
      style={{ maxWidth: '100%', height }}
    />
  );
}; 