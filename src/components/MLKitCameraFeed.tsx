// This component is obsolete and related Tesseract/Plugin logic has been removed
// to prevent build errors.

import React from 'react';

interface Props {
  mode: 'liveness' | 'passport' | 'selfie';
  onResult?: (result: any) => void;
  onError?: (error: string) => void;
  autoCapture?: boolean;
}

const MLKitCameraFeed: React.FC<Props> = ({ mode }) => {
  return (
    <div style={{ padding: '20px', background: 'black', color: 'red' }}>
      <h1>Error: Obsolete MLKitCameraFeed Component</h1>
      <p>Mode: {mode}</p>
      <p>This component is no longer used.</p>
    </div>
  );
};

export default MLKitCameraFeed;