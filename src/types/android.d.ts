export {}
declare global {
  interface Window {
    Android?: { startLiveness: () => void }
    onLivenessResult?: (res: { ok: boolean; score: number }) => void
  }
}
