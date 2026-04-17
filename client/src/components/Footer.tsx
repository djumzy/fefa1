import React from 'react';

export function Footer() {
  const handleClick = () => {
    window.open('https://www.thedreamers.org', '_blank');
  };

  return (
    <footer className="bg-muted/50 border-t border-border py-4 px-6 mt-auto">
      <div className="container mx-auto text-center">
        <p className="text-sm text-muted-foreground">
          Developed by{' '}
          <button
            onClick={handleClick}
            className="text-primary hover:text-primary/80 underline font-medium"
          >
            THE DREAMERS
          </button>
        </p>
      </div>
    </footer>
  );
}