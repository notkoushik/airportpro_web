import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle, Scan, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PassportScanner } from '../components/passport/PassportScanner';
import type { ScanResult, PassportData } from '../types/passport';

/**
 * A robust, self-contained enrollment flow that DOES NOT assume
 * router state/localStorage exists. If none is present, it simply
 * guides the user to scan and proceeds.
 */

// Mapping interface for local display purposes
interface LocalPassportData {
  name: string;
  nationality: string;
  passportNumber: string;
  dob: string;
  expiry: string;
}

// Conversion function to map the canonical PassportData to the local display format
const convertPassportData = (passport: PassportData): LocalPassportData => ({
  name: `${passport.surname}/${passport.givenNames}`,
  nationality: passport.nationality,
  passportNumber: passport.passportNumber,
  dob: passport.dateOfBirth,
  expiry: passport.dateOfExpiry,
});

type StepId = "intro" | "passport" | "position" | "details" | "selfie" | "complete";

export default function SmartPathEnroll() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Pull anything that might have been passed in, but don't require it
  const initialFromState = (location.state as any)?.passportData as PassportData | undefined;
  const initialFromStorage = useMemo<PassportData | undefined>(() => {
    try {
      const raw = localStorage.getItem("passportData");
      return raw ? (JSON.parse(raw) as PassportData) : undefined;
    } catch {
      return undefined;
    }
  }, []);

  const [step, setStep] = useState<StepId>("intro");
  const [isScanning, setIsScanning] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  // State now uses the imported PassportData type
  const [passport, setPassport] = useState<PassportData | undefined>(initialFromState ?? initialFromStorage);
  const [selfieTaken, setSelfieTaken] = useState(false);

  useEffect(() => {
    // keep a copy so subsequent visits have data
    if (passport) {
      localStorage.setItem("passportData", JSON.stringify(passport));
    }
  }, [passport]);

  const steps: { id: StepId; title: string; icon: any }[] = [
    { id: "intro", title: "Enrollment Instructions", icon: User },
    { id: "passport", title: "Scan Your Passport", icon: Scan },
    { id: "position", title: "Position Your Passport", icon: Scan },
    { id: "details", title: "Confirm Details", icon: CheckCircle },
    { id: "selfie", title: "Take a Selfie", icon: Camera },
    { id: "complete", title: "Done", icon: CheckCircle },
  ];

  const goNext = () => {
    const idx = steps.findIndex(s => s.id === step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1].id);
    } else {
      toast({ title: "Enrollment Complete!", description: "You're now enrolled in ProPass!" });
      navigate("/");
    }
  };

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Simulate successful scan results using the correct PassportData structure
      const scanned: PassportData = {
        documentType: "P",
        countryCode: "USA",
        surname: "DOE",
        givenNames: "JOHN",
        passportNumber: "X1234567",
        nationality: "USA",
        dateOfBirth: "1990-05-21",
        sex: "M",
        dateOfExpiry: "2030-12-01",
        personalNumber: "123456789"
      };
      setPassport(scanned);
      setIsScanning(false);
      goNext();
    }, 1400);
  };

  const handleSelfie = () => {
    setIsTakingPhoto(true);
    setTimeout(() => {
      setIsTakingPhoto(false);
      setSelfieTaken(true);
      goNext();
    }, 1200);
  };

  const Header = () => {
    const ActiveIcon = steps.find(s => s.id === step)?.icon ?? User;
    const index = steps.findIndex(s => s.id === step);
    return (
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <ActiveIcon className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-semibold">
              {steps[index]?.title ?? "Enrollment"}
            </h1>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{index + 1} / {steps.length}</div>
        </div>
      </div>
    );
  };

  const Intro = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Let’s get you enrolled</h2>
        <p className="text-muted-foreground">You’ll scan your passport, confirm your details, and take a quick selfie.</p>
      </div>
      <ul className="space-y-2 text-sm">
        <li className="p-3 rounded-lg bg-muted/40">• Have your physical passport ready.</li>
        <li className="p-3 rounded-lg bg-muted/40">• Enable camera access when asked.</li>
        <li className="p-3 rounded-lg bg-muted/40">• This demo does not send any data to a server.</li>
      </ul>
      <Button className="w-full" onClick={() => setStep("passport")}>Let’s begin</Button>
    </div>
  );

  const PassportScan = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <Scan className="h-16 w-16 mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Scan your passport</h2>
        <p className="text-muted-foreground">Position your passport so the camera can read the MRZ at the bottom.</p>
      </div>

      <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
        {isScanning ? (
          <div className="space-y-3">
            <div className="w-32 h-20 bg-primary/20 rounded-md mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground">Scanning…</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-32 h-20 bg-muted rounded-md mx-auto" />
            <p className="text-xs text-muted-foreground">Tap scan to simulate a passport read</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => navigate("/")}>Cancel</Button>
        <Button onClick={handleScan} disabled={isScanning}>
          {isScanning ? "Scanning…" : "Scan passport"}
        </Button>
      </div>
    </div>
  );

  const PositionPassport = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Position your passport</h2>
      <p className="text-muted-foreground">
        Hold your passport firmly against the back of your phone so the NFC chip can be read (simulated).
      </p>
      <Button className="w-full" onClick={goNext}>I’m ready</Button>
    </div>
  );

  const Details = () => {
    // Convert the canonical passport data to the local format for display
    const localPassport = passport ? convertPassportData(passport) : undefined;

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Confirm your details</h2>
        {!localPassport ? (
          <div className="rounded-lg border p-5 text-center">
            <p className="font-medium mb-1">No passport data found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Let’s scan your passport now and continue.
            </p>
            <Button onClick={() => setStep("passport")}>Scan passport</Button>
          </div>
        ) : (
          <Card className="border">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{localPassport.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nationality</p>
                  <p className="font-medium">{localPassport.nationality}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Passport #</p>
                  <p className="font-medium">{localPassport.passportNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">DOB</p>
                  <p className="font-medium">{localPassport.dob}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valid until</p>
                  <p className="font-medium">{localPassport.expiry}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => setStep("passport")}>Rescan</Button>
          <Button onClick={goNext} disabled={!localPassport}>Looks good</Button>
        </div>
      </div>
    );
  };

  const Selfie = () => (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <Camera className="h-16 w-16 mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Take a selfie</h2>
        <p className="text-muted-foreground">Tap the button to simulate capturing a selfie.</p>
      </div>

      <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
        {isTakingPhoto ? (
          <div className="space-y-3">
            <div className="w-24 h-24 bg-primary/20 rounded-full mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground">Taking photo…</p>
          </div>
        ) : selfieTaken ? (
          <div className="space-y-3">
            <div className="w-24 h-24 bg-muted rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Selfie captured</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-24 h-24 bg-muted rounded-full mx-auto" />
            <p className="text-xs text-muted-foreground">No selfie yet</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => setSelfieTaken(false)}>Retake</Button>
        <Button onClick={handleSelfie} disabled={isTakingPhoto}>{isTakingPhoto ? "Capturing…" : "Take selfie"}</Button>
      </div>
    </div>
  );

  const Complete = () => (
    <div className="space-y-6 text-center">
      <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
      <h2 className="text-xl font-semibold">You’re all set!</h2>
      <p className="text-muted-foreground">Enrollment complete. Have a great trip.</p>
      <Button className="w-full" onClick={() => navigate("/")}>Back to Home</Button>
    </div>
  );

  const render = () => {
    switch (step) {
      case "intro": return <Intro />;
      case "passport": return <PassportScan />;
      case "position": return <PositionPassport />;
      case "details": return <Details />;
      case "selfie": return <Selfie />;
      case "complete": return <Complete />;
    }
  };

  // If we navigated here with data, jump ahead a bit.
  useEffect(() => {
    if (passport && step === "intro") setStep("details");
  }, [passport, step]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-screen-sm mx-auto p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>ProPass Enrollment</CardTitle>
            <CardDescription>Follow the steps below to enroll.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* progress */}
            <div className="flex items-center gap-2">
              {steps.map(s => (
                <div
                  key={s.id}
                  className={`h-1 flex-1 rounded-full ${steps.findIndex(x => x.id === s.id) <= steps.findIndex(x => x.id === step) ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>

            {render()}

            {/* Footer nav */}
            {step !== "complete" && step !== "intro" && (
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>Back</Button>
                <Button className="flex-1" onClick={goNext} disabled={step === "details" && !passport}>
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
