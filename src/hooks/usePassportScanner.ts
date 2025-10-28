// This file is obsolete and replaced by services/passportScanner.ts
// The content has been removed to prevent build errors.

import { useState } from 'react';

export const usePassportScanner = () => {
  const [isReady, setIsReady] = useState(true);

  const scanPassport = async () => {
    return Promise.reject(new Error('This hook is obsolete. Use scanPassport from @/services/passportScanner.'));
  };

  return { isReady, scanPassport };
};