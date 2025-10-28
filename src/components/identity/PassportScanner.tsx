// This component is obsolete and related Tesseract logic has been removed.

import React from 'react';
import { Button } from '@/components/ui/button';
import { Scan } from 'lucide-react';

interface PassportScannerProps {
  onComplete: (data: any) => void;
  className?: string;
}

const PassportScanner: React.FC<PassportScannerProps> = ({ onComplete, className }) => {

  const handleClick = () => {
     console.error("PassportScanner component is obsolete. Use UnifiedPassportScanner instead.");
     // Optionally call onComplete with an error or do nothing
     onComplete({ success: false, error: 'PassportScanner component is obsolete.' });
  };

  return (
    <div className={className}>
      <Button onClick={handleClick} disabled>
        <Scan className="mr-2 h-4 w-4" /> Start Passport Scan (Obsolete)
      </Button>
      {/* Removed MRZScanLauncher */}
    </div>
  );
};

export default PassportScanner;