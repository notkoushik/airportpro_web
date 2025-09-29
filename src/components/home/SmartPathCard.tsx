import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, User, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BoardingPassScanner } from "@/components/flights/BoardingPassScanner"; // CORRECTED PATH
import { useState } from "react";

export const SmartPathCard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);

  const handlePassportDetails = () => {
    toast({
      title: "Passport Details",
      description: "Viewing your passport information",
    });
  };

  const handleFlightRegistration = () => {
    setShowScanner(true);
  };

  return (
    <Card className="propass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">ProPass</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-success/20 text-success-foreground">
            Not Enrolled
          </Badge>
        </div>
        <CardDescription>
          Skip the lines with expedited security screening
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="p-2 bg-primary/10 rounded-lg mx-auto w-fit">
              <Scan className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Scan Passport</p>
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-primary/10 rounded-lg mx-auto w-fit">
              <User className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Take Selfie</p>
          </div>
          <div className="space-y-2">
            <div className="p-2 bg-primary/10 rounded-lg mx-auto w-fit">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Fast Track</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={() => navigate('/smart-path/enroll')} 
            className="w-full bg-primary hover:bg-primary/90"
          >
            Enroll in ProPass
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={handlePassportDetails}>
              View Passport Details
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={handleFlightRegistration}>
              Flight Registration
            </Button>
          </div>
        </div>
      </CardContent>
      
      <BoardingPassScanner 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
      />
    </Card>
  );
};