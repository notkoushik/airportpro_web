import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scan, User, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { BoardingPassScanner } from "@/components/flights/BoardingPassScanner";

export const SmartPathCard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);

  const handlePassportDetails = () => {
    toast({ title: "Passport Details", description: "Viewing your passport information" });
  };

  const handleFlightRegistration = () => {
    setShowScanner(true);
  };

  return (
    <Card className="propass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-foreground opacity-90" />
            <CardTitle className="text-lg text-primary-foreground">ProPass</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white">Not Enrolled</Badge>
        </div>
        <CardDescription className="text-primary-foreground/80">
          Skip the lines with expedited security screening
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* QUICK ACTIONS = REAL BUTTONS */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <button
            type="button"
            className="quick-action-button flex flex-col items-center gap-2 py-3"
            onClick={() => navigate("/smart-path/enroll?autoOpen=1")} // UPDATED LINE
          >
            <span className="p-2 bg-white/20 rounded-lg">
              <Scan className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="text-xs text-primary-foreground">Scan Passport</span>
          </button>

          <button
            type="button"
            className="quick-action-button flex flex-col items-center gap-2 py-3"
            onClick={() => navigate("/smart-path/enroll?step=selfie")}
          >
            <span className="p-2 bg-white/20 rounded-lg">
              <User className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="text-xs text-primary-foreground">Take Selfie</span>
          </button>

          <button
            type="button"
            className="quick-action-button flex flex-col items-center gap-2 py-3"
            onClick={() => navigate("/smart-path/enroll")}
          >
            <span className="p-2 bg-white/20 rounded-lg">
              <Clock className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="text-xs text-primary-foreground">Fast Track</span>
          </button>
        </div>

        <Button onClick={() => navigate("/smart-path/enroll")} className="w-full">
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
      </CardContent>

      {/* your existing boarding pass modal */}
      <BoardingPassScanner isOpen={showScanner} onClose={() => setShowScanner(false)} />
    </Card>
  );
};
