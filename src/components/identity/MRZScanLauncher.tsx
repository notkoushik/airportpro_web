// This component is obsolete and its Tesseract.js related logic has been removed
// to prevent build errors.

import React, { useEffect } from 'react';

interface MRZScanLauncherProps {
  onResult: (result: any) => void;
  onClose: () => void;
}

const MRZScanLauncher: React.FC<MRZScanLauncherProps> = ({ onResult, onClose }) => {

  useEffect(() => {
    // Immediately report an error or close, as this component is obsolete.
    console.error("MRZScanLauncher component is obsolete and should not be used.");
    // You could automatically close it:
    // onClose(); 
    // Or report an error result:
    onResult({ success: false, error: 'MRZScanLauncher is obsolete.' });

  }, [onResult, onClose]); // Added dependencies to useEffect

  return (
    <div style={{ padding: '20px', background: 'black', color: 'red', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      <h1>Error: Obsolete MRZScanLauncher Component</h1>
      <p>This component should no longer be used. Please use UnifiedPassportScanner.</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default MRZScanLauncher;