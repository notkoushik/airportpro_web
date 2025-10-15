import React from 'react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = "AirportPro", 
  showBack = false, 
  onBack 
}) => {
  return (
    <header className="flex items-center justify-between p-4 bg-white shadow-sm">
      <div className="flex items-center">
        {showBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            ←
          </Button>
        )}
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {/* Add notification or profile icons here */}
      </div>
    </header>
  );
};
