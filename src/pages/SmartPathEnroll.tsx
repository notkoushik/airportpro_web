// src/pages/SmartPathEnroll.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Camera, Scan, User, CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import MRZScanLauncher from "@/components/identity/MRZScanLauncher";

type MRZData = {
  firstName?: string;
  lastName?: string;
  givenName?: string;
  givenNames?: string;
  surname?: string;
  nationality?: string;
  documentNumber?: string;
  docNumber?: string;
  dateOfExpiry?: { text?: string } | string;
  expiry?: string;
};

export default function SmartPathEnroll() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [mrzData, setMrzData] = useState<MRZData | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const steps = [
    { id: "intro", title: "Enrollment Instructions", icon: User },
    { id: "passport", title: "Scan Your Passport", icon: Scan },
    { id: "position", title: "Position Your Passport", icon: Scan },
    { id: "details", title: "Passport Details", icon: CheckCircle },
    { id: "selfie", title: "Take a Selfie", icon: Camera },
    { id: "complete", title: "Enrollment Complete", icon: CheckCircle },
  ] as const;

  // Auto-jump/open from ?autoOpen=1 or deep link to ?step=selfie
  useEffect(() => {
    if (searchParams.get("autoOpen") === "1") {
      const passportIndex = steps.findIndex((s) => s.id === "passport");
      if (passportIndex !== -1) setCurrentStep(passportIndex);
      setShowScanner(true);
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

  const openScanner = () => setShowScanner(true);

  const handleTakePhoto = () => {
    setIsTakingPhoto(true);
    setTimeout(() => {
      setIsTakingPhoto(false);
      handleNext();
    }, 1500);
  };

  const displayName = (() => {
    if (!mrzData) return "John Doe";
    const first = mrzData.firstName || mrzData.givenName || mrzData.givenNames || "";
    const last = mrzData.lastName || mrzData.surname || "";
    return `${first} ${last}`.trim() || "John Doe";
  })();

  const passportNumber = mrzData?.documentNumber || mrzData?.docNumber || "123456789";

  const expiry =
    typeof mrzData?.dateOfExpiry === "string"
      ? mrzData.dateOfExpiry
      : mrzData?.dateOfExpiry?.text || mrzData?.expiry || "12/2030";

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
                        We’ll capture the Machine Readable Zone (MRZ) at the bottom.
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
                When the camera opens, align the MRZ (the two lines at the bottom) inside the frame.
              </p>
            </div>

            <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
              <div className="space-y-4">
                <div className="h-24 w-32 bg-primary/20 rounded-lg mx-auto flex items-center justify-center">
                  <Scan className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Tap the button below to open the scanner. Grant camera permission if asked.
                </p>
              </div>
            </div>

            <Button onClick={openScanner} className="w-full bg-primary hover:bg-primary/90">
              OPEN PASSPORT SCANNER
            </Button>

            {showScanner && (
              <MRZScanLauncher
                onResult={(res: any) => {
                  const data: MRZData | undefined = res?.data;
                  if (data) setMrzData(data);
                  setShowScanner(false);
                  const detailsIndex = steps.findIndex((s) => s.id === "details");
                  setCurrentStep(detailsIndex >= 0 ? detailsIndex : currentStep + 1);
                }}
                onClose={() => setShowScanner(false)}
              />
            )}
          </div>
        );

      case "position":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg mx-auto w-fit">
                <Scan className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Position your passport</h2>
              <p className="text-muted-foreground">
                Touch OK and then hold your passport firmly against the back of your smartphone to read the
                passport’s chip (if supported).
              </p>
            </div>

            <Button onClick={handleNext} className="w-full bg-primary hover:bg-primary/90">
              OK
            </Button>
          </div>
        );

      case "details":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Your Passport Details</h2>
              <p className="text-muted-foreground">Please confirm that all of the information below is correct.</p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">{displayName}</h3>
                    <p className="text-sm text-muted-foreground">{mrzData?.nationality || "USA"}</p>
                    <p className="text-sm text-muted-foreground">Passport: {passportNumber}</p>
                    <p className="text-sm text-muted-foreground">Valid until: {expiry}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(steps.findIndex((s) => s.id === "passport"))}
              >
                Back
              </Button>
              <Button onClick={handleNext} className="bg-primary hover:bg-primary/90">
                Looks Good
              </Button>
            </div>
          </div>
        );

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
        <Card>
          <CardContent className="p-6">{renderStepContent()}</CardContent>
        </Card>
      </div>
    </div>
  );
}
