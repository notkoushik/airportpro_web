// src/@types/global.d.ts

// Global type declarations to fix TypeScript errors

declare global {
  // Fix for "Cannot find name 'Boolean'" errors
  interface Window {
    [key: string]: any;
  }

  // Extend global types if needed
  var Boolean: BooleanConstructor;
  var String: StringConstructor;  
  var Number: NumberConstructor;
  var Date: DateConstructor;
  var Array: ArrayConstructor;
  var Object: ObjectConstructor;
  var Error: ErrorConstructor;
  var Math: Math;
  var parseInt: (string: string, radix?: number) => number;
  
  // DOM types
  interface ImageDataArray extends Uint8ClampedArray {}
}

// Module augmentations for third-party libraries
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

export {};
