// This component is obsolete and its Tesseract.js logic has been removed
// to prevent build errors.

import React from 'react';

interface ScannerProps {
  onScan: (result: any) => void;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onClose }) => {
  return (
    <div style={{ padding: '20px', background: 'black', color: 'red' }}>
      <h1>Error: Obsolete Scanner Component</h1>
      <p>This component is no longer used. Please use UnifiedPassportScanner.</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default Scanner;