// src/pages/SmartPathEnroll.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
// UPDATED IMPORT
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Scan, User, CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import MRZScanLauncher from "@/components/identity/MRZScanLauncher";
import { SmartScannerPlugin } from '@idpass/smartscanner-capacitor';

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

  const steps = [
    { id: "intro", title: "Enrollment Instructions", icon: User },
    { id: "passport", title: "Scan Your Passport", icon: Scan },
    { id: "details", title: "Passport Details", icon: CheckCircle },
    { id: "selfie", title: "Take a Selfie", icon: Camera },
    { id: "complete", title: "Enrollment Complete", icon: CheckCircle },
  ] as const;

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

  // --- NEW COMBINED SCAN FUNCTION ---
  const startCombinedPassportScan = async () => {
    setIsScanning(true);
    setScanError(""); // Clear previous errors

    try {
      // Step 1: MRZ Scan
      toast({
        title: "Scanning Passport MRZ",
        description: "Please align your passport in the camera frame.",
      });
      const mrzResult = await SmartScannerPlugin.executeScanner({
        action: 'START_SCANNER',
        options: {
          mode: 'mrz', // This tells it to look for a passport
          mrzFormat: 'MRTD_TD3', // Standard passport format
        },
      });

      if (!mrzResult || !mrzResult.data) {
        throw new Error(mrzResult?.error || 'MRZ scan failed or returned no data.');
      }

      console.log('MRZ Scan Complete:', mrzResult.data);
      const mrzData = mrzResult.data; // This contains MRZ fields

      // Step 2: NFC Read
      toast({
        title: "Reading Passport Chip",
        description: "Hold your passport firmly against the back of your phone.",
      });
      const nfcResult = await SmartScannerPlugin.executeScanner({
        action: 'READ_NFC',
        options: {
          mrz: mrzData, // Pass the MRZ data to the NFC reader
        },
      });

      if (!nfcResult || !nfcResult.data) {
        throw new Error(nfcResult?.error || 'NFC read failed or returned no data.');
      }

      console.log('NFC Read Complete:', nfcResult.data);
      const fullPassportData = nfcResult.data; // This should contain all passport info including photo

      // Map SmartScannerPlugin's result to your PassportData type
      setPassportData({
        ...fullPassportData, // Assuming SmartScannerPlugin returns compatible fields
        photoBase64: fullPassportData.image, // Map 'image' from plugin to 'photoBase64'
      });
        toast({
          title: "Passport Scanned Successfully!",
          description: `Welcome, ${fullPassportData.givenNames} ${fullPassportData.surname}`,
        });
        handleNext();
    } catch (error) {
      // Cast error to get message
      const e = error as Error;
      setScanError(`Error: ${e.message}`);
      toast({
        title: "Scan Error",
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };
  // --- END NEW COMBINED SCAN FUNCTION ---

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

            <Button onClick={startCombinedPassportScan} disabled={isScanning} className="w-full bg-primary hover:bg-primary/90">
              {isScanning ? "Scanning... Hold Still..." : "OPEN PASSPORT SCANNER"}
            </Button>
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
                      <dt className="text-muted-foreground">Nationality:</dt>
                      <dd className="font-medium">{passportData.nationality}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Passport:</dt>
                      <dd className="font-medium">{passportData.documentNumber}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">DOB:</dt>
                      <dd className="font-medium">{passportData.dateOfBirth}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Expiry:</dt>
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
          <div className="grid grid-cols-6 gap-2">
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