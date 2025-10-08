import { useEffect, useRef } from "react";

const SDK_URL =
  "https://cdn.jsdelivr.net/npm/dynamsoft-mrz-scanner@3.0.3/dist/mrz-scanner.bundle.js";

/** Load the MRZ scanner bundle if it isn't on window yet */
async function ensureDynamsoft(): Promise<any> {
  if ((window as any).Dynamsoft?.MRZScanner) return (window as any).Dynamsoft;

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load MRZ SDK"));
    document.head.appendChild(s);
  });

  return (window as any).Dynamsoft;
}

type Props = {
  onResult: (result: any) => void; // MRZResult (result.data.*)
  onClose?: () => void;            // fires on close/cancel or on error
};

export default function MRZScanLauncher({ onResult, onClose }: Props) {
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const DS = await ensureDynamsoft();
        if (!DS?.MRZScanner) {
          console.error("Dynamsoft.MRZScanner not available after loading script.");
          onClose?.();
          return;
        }

        const license = import.meta.env.VITE_DYNAMSOFT_LICENSE;
        if (!license) {
          console.error("Missing VITE_DYNAMSOFT_LICENSE env var.");
          alert("Passport scanner is not configured (missing license).");
          onClose?.();
          return;
        }

        // Tip: with npm installs, point engine files to a CDN root (JSDelivr works great). :contentReference[oaicite:1]{index=1}
        const mrzScanner = new DS.MRZScanner({
          license,
          engineResourcePaths: { rootDirectory: "https://cdn.jsdelivr.net/npm/" },
          // You can also fine-tune UI/behavior via scannerViewConfig/resultViewConfig if needed. :contentReference[oaicite:2]{index=2}
        });

        scannerRef.current = mrzScanner;

        // Open ready-to-use camera UI and wait for a result. :contentReference[oaicite:3]{index=3}
        const result = await mrzScanner.launch();
        onResult?.(result);
      } catch (err) {
        console.error(err);
        alert("Could not start the passport scanner. Check the console for details.");
      } finally {
        try { scannerRef.current?.destroy?.(); } catch {}
        onClose?.();
      }
    })();

    return () => {
      try { scannerRef.current?.destroy?.(); } catch {}
    };
  }, [onResult, onClose]);

  return null; // SDK renders its own full-screen UI
}
