import React from 'react';

interface LogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ width = 180, height = 'auto', className }) => (
  <img
    src="/metalma-logo.png"
    alt="Logo Metalma Inox & Cia"
    width={width}
    height={height}
    className={className}
    style={{ maxWidth: '100%', height }}
  />
); 