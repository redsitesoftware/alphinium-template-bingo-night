import React from 'react';

export const AnimatedLogo = ({ 
  src, 
  alt = "Logo", 
  animation = "none", 
  size = "50px",
  className = ''
}) => {
  const animationClass = animation !== "none" ? `animate-${animation}` : '';
  
  return (
    <img 
      src={src}
      alt={alt}
      className={`animated-logo ${animationClass} ${className}`}
      style={{ 
        width: size, 
        height: size,
        objectFit: 'contain'
      }}
    />
  );
};
