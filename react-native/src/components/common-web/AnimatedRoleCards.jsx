import React, { useState, useEffect } from 'react';

export const AnimatedRoleCards = ({ 
  roles = [], 
  autoPlay = true, 
  sleepModeDelay = 10000,
  cardChangeInterval = 5000,
  className = ''
}) => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!isPlaying || roles.length === 0) return;

    const interval = setInterval(() => {
      setExpandedCard((prev) => {
        const nextIndex = prev === null ? 0 : (prev + 1) % roles.length;
        return nextIndex;
      });
    }, cardChangeInterval);

    return () => clearInterval(interval);
  }, [isPlaying, roles.length, cardChangeInterval]);

  const handleCardClick = (index) => {
    setExpandedCard(index);
    setIsPlaying(false);
    
    if (sleepModeDelay > 0) {
      setTimeout(() => setIsPlaying(true), sleepModeDelay);
    }
  };

  return (
    <div className={`animated-role-cards-wrapper ${className}`}>
      <div className="roles-section">
        {roles.map((role, index) => (
          <div
            key={role.id}
            className={`role-card role-${role.id} ${expandedCard === index ? 'expanded' : ''}`}
            onClick={() => handleCardClick(index)}
          >
            <div className="role-full-name-bg">{role.initials}</div>
            <div className="role-header">
              <div className="role-header-content">
                <div className="role-icon-simple">{role.icon}</div>
                <div className="role-initials-text">{role.initials}</div>
              </div>
            </div>
            <div className="role-content">
              <h3 className="role-title">{role.fullName}</h3>
              <p className="role-subtitle">{role.description}</p>
              <p className="role-description-text">{role.details}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
