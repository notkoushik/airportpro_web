import React, { useState } from 'react';
import MRZScanLauncher from './MRZScanLauncher';
import { Button } from '@/components/ui/button';
import { Scan } from 'lucide-react';

interface PassportScannerProps {
  onComplete: (data: any) => void;
  className?: string;
}

const PassportScanner: React.FC<PassportScannerProps> = ({ onComplete, className }) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleResult = (result: any) => {
    onComplete(result.data);
    setIsScanning(false);
  };

  const handleClose = () => {
    setIsScanning(false);
  };

  return (
    <div className={className}>
      <Button onClick={() => setIsScanning(true)}><Scan className="mr-2 h-4 w-4" /> Start Passport Scan</Button>
      {isScanning && <MRZScanLauncher onResult={handleResult} onClose={handleClose} />}
    </div>
  );
};

export default PassportScanner;