declare global {
  interface Window {
    Android?: {
      // new names
      startLivenessVerification?: () => void;
      startEnrollment?: () => void;

      // legacy names (present right now)
      openAuth?: () => void;
      openEnroll?: () => void;

      // utils
      toast?: (msg: string) => void;
      getStatus?: () => string;
      close?: () => void;
      postMessage?: (msg: string) => void;
    };
  }
}

export const inAndroidWebView = !!window.Android;

function call<T extends keyof NonNullable<typeof window.Android>>(name: T, fallback?: T) {
  const a = window.Android;
  if (!a) return false;
  const fn = a[name] || (fallback ? a[fallback] : undefined);
  if (typeof fn === "function") {
    try { fn(); } catch (e) { console.error(`[bridge] ${String(name)} failed`, e); }
    return true;
  }
  return false;
}

export const startEnrollment = () => {
  if (call("startEnrollment", "openEnroll")) {
    console.log("[bridge] Enrollment requested via Android bridge");
  } else {
    alert("Open this app in Android to enroll.");
  }
};

export const startLivenessVerification = () => {
  if (call("startLivenessVerification", "openAuth")) {
    console.log("[bridge] Liveness requested via Android bridge");
  } else {
    alert("Open this app in Android to use Liveness.");
  }
};
