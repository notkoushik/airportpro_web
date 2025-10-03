import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Header } from '@/components/core/Header';
import CameraFeed from '@/components/CameraFeed';
import { useToast } from '@/hooks/use-toast';

// This component uses a default export
const SmartPathEnroll = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Retrieve passport data passed from the previous page
  const passportData = location.state?.passportData;

  // Handler for completing the enrollment
  const handleEnrollmentComplete = () => {
    toast({
      title: "Enrollment Successful!",
      description: "You are now enrolled in ProPass.",
      variant: "default"
    });
    // Navigate back to the home screen after enrollment
    navigate('/');
  };

  if (!passportData) {
    return (
      <div className="p-4">
        <Header title="Enrollment Error" showBackButton={true} />
        <div className="flex flex-col items-center justify-center h-[80vh] text-center">
            <p className="text-lg font-semibold">No passport data found.</p>
            <p className="text-muted-foreground mb-4">Please go back and scan your passport first.</p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Header title="ProPass Enrollment" showBackButton={true} />

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Confirm Your Details</CardTitle>
          <CardDescription>
            Please verify the information scanned from your passport.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="font-semibold text-muted-foreground">First Name:</div>
          <div>{passportData.firstName}</div>
          <div className="font-semibold text-muted-foreground">Last Name:</div>
          <div>{passportData.lastName}</div>
          <div className="font-semibold text-muted-foreground">Nationality:</div>
          <div>{passportData.nationality}</div>
          <div className="font-semibold text-muted-foreground">Date of Birth:</div>
          <div>{passportData.dateOfBirth}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Take a Selfie</CardTitle>
          <CardDescription>
            This will be used for biometric verification at security gates.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* The CameraFeed component will handle the selfie capture */}
            <CameraFeed />
        </CardContent>
      </Card>

      <Button
        className="w-full h-12 text-lg font-bold"
        onClick={handleEnrollmentComplete}
      >
        Complete Enrollment
      </Button>
    </div>
  );
};

export default SmartPathEnroll;
