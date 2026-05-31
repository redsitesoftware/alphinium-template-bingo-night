import React, { useState, useEffect } from 'react';

export const ConfigurableHeader = ({ brand, links = [], actions = [], scrollTrigger = false, className = '' }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!scrollTrigger) return;
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollTrigger]);

  return (
    <header className={`${className} ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <a href="/" className="brand">{brand}</a>
        <nav className="nav-links">
          {links.map((link, index) => (
            <a 
              key={index} 
              href={link.href}
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {link.text}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          {actions.map((action, index) => (
            <a 
              key={index}
              href={action.href}
              className={action.className || ''}
              {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {action.text}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
};
