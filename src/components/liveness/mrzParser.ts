// This file is obsolete and its Tesseract.js logic has been removed
// to prevent build errors.

export const parseMRZ = async (image: string) => {
  console.error("mrzParser.ts is obsolete. This function should not be called.");
  console.log(image); // To prevent "unused parameter" errors
  return Promise.reject(new Error('mrzParser.ts is obsolete.'));
};