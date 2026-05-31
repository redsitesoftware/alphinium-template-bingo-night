import React from 'react';

export const ConfigurableFooter = ({ companyInfo, columns = [], bottomInfo }) => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-company">
            <h3>{companyInfo.name}</h3>
            <p>{companyInfo.description}</p>
            {companyInfo.additionalInfo && (
              <div className="footer-additional">{companyInfo.additionalInfo}</div>
            )}
          </div>
          
          {columns.map((column, index) => (
            <div key={index} className="footer-column">
              <h4>{column.title}</h4>
              <ul>
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    {link.href ? (
                      <a 
                        href={link.href}
                        className={link.disabled ? 'disabled' : ''}
                        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {link.text}
                      </a>
                    ) : (
                      <span className={link.disabled ? 'disabled' : ''}>{link.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {bottomInfo && (
          <div className="footer-bottom">
            <p>{bottomInfo.copyright}</p>
            {bottomInfo.additionalLinks && bottomInfo.additionalLinks.length > 0 && (
              <div className="footer-bottom-links">
                {bottomInfo.additionalLinks.map((link, index) => (
                  <a 
                    key={index}
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {link.text}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
};
