// src/pages/SmartPathEnroll.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
// UPDATED IMPORT
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Scan, User, CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import MRZScanLauncher from "@/components/identity/MRZScanLauncher";
import { registerPlugin } from '@capacitor/core';
import type { SmartScannerPlugin } from '@idpass/smartscanner-capacitor';

// Use Capacitor's standard plugin registration
const SmartScanner = registerPlugin<SmartScannerPlugin>('SmartScanner');
// Assuming PassportData is defined in src/types/passport.ts
import type { PassportData } from '@/types/passport';

export default function SmartPathEnroll() {
  const [currentStep, setCurrentStep] = useState(0);
  // Removed showScanner and mrzData as MRZScanLauncher is no longer used
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // --- ADDED/MODIFIED LINES ---
  const [passportData, setPassportData] = useState<PassportData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string>(""); // Added missing state
  // --------------------------

  type Step = { id: 'intro'|'passport'|'details'|'selfie'|'complete'; title: string; icon: any };
  const steps: Step[] = [
    { id: "intro", title: "Enrollment Instructions", icon: User },
    { id: "passport", title: "Scan Your Passport", icon: Scan },
    { id: "details", title: "Passport Details", icon: CheckCircle },
    { id: "selfie", title: "Take a Selfie", icon: Camera },
    { id: "complete", title: "Enrollment Complete", icon: CheckCircle },
  ];

  // Auto-jump/open from ?autoOpen=1 or deep link to ?step=selfie
  useEffect(() => {
    if (searchParams.get("autoOpen") === "1") {
      const passportIndex = steps.findIndex((s) => s.id === "passport");
      if (passportIndex !== -1) setCurrentStep(passportIndex);
      // The scanner will be opened directly by the button click in the 'passport' step
    }
    if (searchParams.get("step") === "selfie") {
      const selfieIndex = steps.findIndex((s) => s.id === "selfie");
      if (selfieIndex !== -1) setCurrentStep(selfieIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      toast({
        title: "Enrollment Complete!",
        description: "You're now enrolled in ProPass!",
      });
      navigate("/");
    }
  };

  const handleTakePhoto = () => {
    setIsTakingPhoto(true);
    setTimeout(() => {
      setIsTakingPhoto(false);
      handleNext();
    }, 1500);
  };

  // Inside your SmartPathEnroll.tsx component
  const handleScanClick = async () => {
    setScanError(""); // Clear any old errors
    setIsScanning(true);

    try {
      // 0) (once) request camera + nfc
      // @ts-ignore – depending on plugin typings
      await SmartScanner.requestPermissions?.({ permissions: ['camera', 'nfc'] });

      // 1) MRZ
      const mrzResult = await SmartScanner.executeScanner({
        action: 'START_SCANNER',
        options: { mode: 'mrz', mrzFormat: 'MRTD_TD3' },
      });

      // @ts-ignore
      if (mrzResult?.status === 'CANCELED' || mrzResult?.cancelled) {
        throw new globalThis.Error('MRZ scan canceled by user');
      }
      if (!mrzResult?.data) throw new globalThis.Error(mrzResult?.error || 'MRZ scan failed');

      // 2) NFC
      const nfcResult = await SmartScanner.executeScanner({
        action: 'READ_NFC',
        options: { mrz: mrzResult.data },
      });
 
      // @ts-ignore
      if (nfcResult?.status === 'CANCELED' || nfcResult?.cancelled) {
        throw new globalThis.Error('NFC scan canceled by user');
      }
      if (!nfcResult?.data) throw new globalThis.Error(nfcResult?.error || 'NFC scan failed');

      setPassportData(nfcResult.data);
      handleNext();
    } catch (e:any) {
      setScanError(e.message ?? 'Scan failed');
      toast({ title: "Scan Failed", description: e.message ?? 'Scan failed', variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case "intro":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Enrollment Instructions</h2>
              <p className="text-muted-foreground">To enroll in ProPass, you'll need to:</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">1</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">Scan your passport</p>
                      <p className="text-sm text-muted-foreground">
                        We’ll capture the Machine Readable Zone (MRZ) and read the chip.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">2</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">Confirm your details</p>
                      <p className="text-sm text-muted-foreground">
                        We’ll show what we read from your passport so you can confirm.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-medium">3</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">Take a selfie</p>
                      <p className="text-sm text-muted-foreground">One quick selfie and you’re done.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button onClick={handleNext} className="w-full bg-primary hover:bg-primary/90">
              LET'S BEGIN
            </Button>
          </div>
        );

      case "passport":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Scan className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Scan your passport</h2>
              <p className="text-muted-foreground">
                Tap the button below to open the scanner. It will first scan the MRZ, then prompt you to hold your passport to the phone for NFC reading.
              </p>
            </div>

            <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
              <div className="space-y-4">
                <div className="h-24 w-32 bg-primary/20 rounded-lg mx-auto flex items-center justify-center">
                  <Scan className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Grant camera and NFC permissions if asked.
                </p>
              </div>
            </div>

            <Button onClick={handleScanClick} disabled={isScanning} className="w-full bg-primary hover:bg-primary/90">
              {isScanning ? "Scanning..." : "Start Passport Scan"}
            </Button>
            {scanError && <p className="text-center text-sm text-red-500">{scanError}</p>}
          </div>
        );

      // --- THIS ENTIRE BLOCK IS REPLACED ---
      case "details":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Your Passport Details</CardTitle>
            </CardHeader>
            <CardContent>
              {passportData ? (
                <div className="space-y-4">
                  {/* Optional: Display Photo */}
                  {passportData.photoBase64 && (
                     <div className="w-24 h-32 bg-muted rounded-lg flex items-center justify-center mx-auto">
                        <img
                          src={`data:image/jpeg;base64,${passportData.photoBase64}`}
                          alt="Passport"
                          className="h-full w-full object-cover rounded-lg"
                        />
                     </div>
                  )}
                  <h3 className="text-lg font-semibold text-center">
                    {passportData.givenNames} {passportData.surname}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Nationality</dt>
                      <dd className="font-medium">{passportData.nationality}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Passport No.</dt>
                      <dd className="font-medium">{passportData.documentNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Date of Birth</dt>
                      <dd className="font-medium">{passportData.dateOfBirth}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Expiry Date</dt>
                      <dd className="font-medium">{passportData.expiryDate}</dd>
                    </div>
                  </dl>
                  
                  <div className="grid grid-cols-2 gap-3 pt-4">
                     <Button
                        variant="outline"
                        onClick={() => setCurrentStep(steps.findIndex((s) => s.id === "passport"))}
                     >
                        Back
                     </Button>
                     <Button onClick={handleNext} className="w-full bg-primary hover:bg-primary/90">
                        Confirm
                     </Button>
                  </div>
                  
                </div>
              ) : (
                 <div className="text-center space-y-4">
                    <p className="text-muted-foreground">No passport data read from the chip.</p>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentStep(steps.findIndex((s) => s.id === "passport"))}
                     >
                        Try Scan Again
                     </Button>
                 </div>
              )}
            </CardContent>
          </Card>
        );
      // --- END OF REPLACED BLOCK ---

      case "selfie":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Take a selfie</h2>
              <p className="text-muted-foreground">
                Make sure your face is centered and well-lit, then take your picture.
              </p>
            </div>

            <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
              {isTakingPhoto ? (
                <div className="space-y-4">
                  <div className="w-32 h-32 bg-primary/20 rounded-full mx-auto animate-pulse" />
                  <p className="text-sm text-muted-foreground">Taking photo...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-32 h-32 bg-primary/20 rounded-full mx-auto flex items-center justify-center">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">We’ll use this to verify it’s you.</p>
                </div>
              )}
            </div>

            <Button onClick={handleTakePhoto} disabled={isTakingPhoto} className="w-full bg-primary hover:bg-primary/90">
              <Camera className="h-4 w-4 mr-2" />
              {isTakingPhoto ? "Taking Photo..." : "TAKE PHOTO"}
            </Button>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg mx-auto w-fit">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">You're all set!</h2>
              <p className="text-muted-foreground">Your ProPass enrollment is complete.</p>
            </div>

            <Button onClick={() => navigate("/")} className="w-full bg-primary hover:bg-primary/90">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Enroll in ProPass</h1>
              <p className="text-sm text-muted-foreground">Get through security faster</p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-5 gap-2">
            {steps.map((_, index) => (
              <div key={index} className={`h-2 rounded-full ${index <= currentStep ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 ${
                  index === currentStep ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Removed the extra Card/CardContent wrapper from 'details' to avoid double cards */}
        {steps[currentStep].id === "details" ? (
          renderStepContent()
        ) : (
          <Card>
            <CardContent className="p-6">{renderStepContent()}</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}