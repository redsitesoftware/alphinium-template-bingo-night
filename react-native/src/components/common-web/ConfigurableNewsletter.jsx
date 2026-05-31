import React, { useState } from 'react';

export const ConfigurableNewsletter = ({ 
  title, 
  description, 
  placeholder = "Enter your email",
  submitText = "Subscribe",
  successMessage = "Successfully subscribed!"
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setStatus('Please enter an email address');
      return;
    }

    try {
      // Add your newsletter subscription logic here
      setStatus(successMessage);
      setEmail('');
    } catch (error) {
      setStatus('Failed to subscribe. Please try again.');
    }
  };

  return (
    <section className="newsletter">
      <div className="newsletter-container">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        
        <form onSubmit={handleSubmit} className="newsletter-form">
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="newsletter-input"
          />
          <button type="submit" className="newsletter-button">
            {submitText}
          </button>
        </form>
        
        {status && <p className="newsletter-status">{status}</p>}
      </div>
    </section>
  );
};
