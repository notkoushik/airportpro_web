import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Scan, User, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function SmartPathEnroll() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const steps = [
    { id: 'intro', title: 'Enrollment Instructions', icon: User },
    { id: 'passport', title: 'Scan Your Passport', icon: Scan },
    { id: 'position', title: 'Position Your Passport', icon: Scan },
    { id: 'details', title: 'Passport Details', icon: CheckCircle },
    { id: 'selfie', title: 'Take a Selfie', icon: Camera },
    { id: 'complete', title: 'Enrollment Complete', icon: CheckCircle }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      toast({
        title: "Enrollment Complete!",
        description: "You're now enrolled in ProPass!",
      });
      navigate('/');
    }
  };

  const handleScanPassport = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      handleNext();
    }, 2000);
  };

  const handleTakePhoto = () => {
    setIsTakingPhoto(true);
    setTimeout(() => {
      setIsTakingPhoto(false);
      handleNext();
    }, 2000);
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Enrollment Instructions</h2>
              <p className="text-muted-foreground">
                To enroll in ProPass, you'll need to:
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                  1
                </div>
                <span>Scan your passport</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                  2
                </div>
                <span>Read your passport chip</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                  3
                </div>
                <span>Take a selfie</span>
              </div>
            </div>
            
            <Button onClick={handleNext} className="w-full bg-primary hover:bg-primary/90">
              LET'S BEGIN
            </Button>
          </div>
        );

      case 'passport':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Scan className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Scan your passport</h2>
              <p className="text-muted-foreground">
                When the camera is presented, position your passport so we can capture the data at the bottom of the page.
              </p>
            </div>
            
            <div className="bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
              {isScanning ? (
                <div className="space-y-4">
                  <div className="h-24 w-32 bg-primary/20 rounded-lg mx-auto animate-pulse" />
                  <p className="text-sm text-muted-foreground">Scanning passport...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-24 w-32 bg-muted rounded-lg mx-auto" />
                  <p className="text-sm text-muted-foreground">Position passport here</p>
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleScanPassport} 
              disabled={isScanning}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isScanning ? "Scanning..." : "SCAN PASSPORT"}
            </Button>
          </div>
        );

      case 'position':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg mx-auto w-fit">
                <Scan className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Position your passport</h2>
              <p className="text-muted-foreground">
                Touch OK and then hold your passport firmly against the back of your smartphone to read the information on the passport's microchip.
              </p>
            </div>
            
            <Button onClick={handleNext} className="w-full bg-primary hover:bg-primary/90">
              OK
            </Button>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Your Passport Details</h2>
              <p className="text-muted-foreground">
                Please confirm that all of the information below is correct.
              </p>
            </div>
            
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 bg-muted rounded-lg flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">John Doe</h3>
                    <p className="text-sm text-muted-foreground">USA</p>
                    <p className="text-sm text-muted-foreground">Passport: 123456789</p>
                    <p className="text-sm text-muted-foreground">Valid until: 12/2030</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button onClick={handleNext} className="w-full bg-primary hover:bg-primary/90">
              CONTINUE
            </Button>
          </div>
        );

      case 'selfie':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Take a selfie</h2>
              <p className="text-muted-foreground">
                We need a selfie to get you enrolled in ProPass. Tap the camera icon to take your picture.
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
                  <div className="w-32 h-32 bg-muted rounded-full mx-auto flex items-center justify-center">
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Position your face in the circle</p>
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleTakePhoto}
              disabled={isTakingPhoto}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isTakingPhoto ? "Taking Photo..." : "TAKE PHOTO"}
            </Button>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-success" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Enrollment Complete!</h2>
              <p className="text-muted-foreground">
                You're now enrolled in ProPass. Enjoy expedited security screening on your next flight.
              </p>
            </div>
            
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <p className="text-sm text-success-foreground">
                Your ProPass status is now active. Present your boarding pass and ID at designated ProPass lanes.
              </p>
            </div>
            
            <Button onClick={handleNext} className="w-full bg-primary hover:bg-primary/90">
              DONE
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
      <div className="bg-gradient-aviation text-white p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">ProPass Mobile</h1>
            <p className="text-sm opacity-90">Secure | Fast | Secure</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}