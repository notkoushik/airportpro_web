import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scan, User, Shield, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { usePassportScanner } from "@/hooks/usePassportScanner";

export const SmartPathCard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scanPassport, checkNfcAvailability, isScanning } = usePassportScanner();
  
  const [showPassportForm, setShowPassportForm] = useState(false);
  const [passportData, setPassportData] = useState({
    documentNumber: '',
    dateOfBirth: '',
    dateOfExpiry: ''
  });

  const handlePassportScan = async () => {
    const isNfcAvailable = await checkNfcAvailability();
    
    if (!isNfcAvailable) {
      toast({
        title: "NFC Not Available",
        description: "Please enable NFC and try again",
        variant: "destructive"
      });
      return;
    }
    
    setShowPassportForm(true);
  };

  const handleScanSubmit = async () => {
    if (!passportData.documentNumber || !passportData.dateOfBirth || !passportData.dateOfExpiry) {
      toast({
        title: "Missing Information",
        description: "Please fill in all passport details",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Hold Passport Near Phone",
        description: "Place passport on the back of your phone"
      });

      const result = await scanPassport(
        passportData.documentNumber,
        passportData.dateOfBirth,
        passportData.dateOfExpiry
      );

      toast({
        title: "Passport Scanned Successfully!",
        description: `Welcome ${result.firstName} ${result.lastName}`,
        variant: "default"
      });

      setShowPassportForm(false);
      
      // Navigate to enrollment with passport data
      navigate('/smart-path/enroll', { state: { passportData: result } });

    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (showPassportForm) {
    return (
      <Card className="propass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Passport Scanner
          </CardTitle>
          <CardDescription className="text-white/80">
            Enter your passport details for NFC scanning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="documentNumber">Document Number</Label>
            <Input
              id="documentNumber"
              value={passportData.documentNumber}
              onChange={(e) => setPassportData(prev => ({
                ...prev,
                documentNumber: e.target.value.toUpperCase()
              }))}
              placeholder="AB1234567"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth (YYMMDD)</Label>
            <Input
              id="dateOfBirth"
              value={passportData.dateOfBirth}
              onChange={(e) => setPassportData(prev => ({
                ...prev,
                dateOfBirth: e.target.value
              }))}
              placeholder="901225"
              maxLength={6}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label htmlFor="dateOfExpiry">Date of Expiry (YYMMDD)</Label>
            <Input
              id="dateOfExpiry"
              value={passportData.dateOfExpiry}
              onChange={(e) => setPassportData(prev => ({
                ...prev,
                dateOfExpiry: e.target.value
              }))}
              placeholder="301225"
              maxLength={6}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleScanSubmit}
              disabled={isScanning}
              className="flex-1 bg-white text-primary hover:bg-white/90"
            >
              {isScanning ? "Scanning..." : "Start NFC Scan"}
            </Button>
            <Button 
              onClick={() => setShowPassportForm(false)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="propass-card">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="font-semibold">ProPass</span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            Not Enrolled
          </Badge>
        </div>
        <CardDescription className="text-white/80">
          Skip the lines with expedited security screening
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around mb-6">
          <div className="text-center">
            <Scan className="h-6 w-6 mx-auto mb-2 text-white/80" />
            <p className="text-xs text-white/70">Scan Passport</p>
          </div>
          <div className="text-center">
            <User className="h-6 w-6 mx-auto mb-2 text-white/80" />
            <p className="text-xs text-white/70">Take Selfie</p>
          </div>
          <div className="text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-white/80" />
            <p className="text-xs text-white/70">Fast Track</p>
          </div>
        </div>
        
        <Button 
          className="w-full mb-3 bg-white text-primary hover:bg-white/90"
          onClick={() => navigate('/smart-path/enroll')}
        >
          Enroll in ProPass
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-white/20 text-white hover:bg-white/10"
            onClick={handlePassportScan}
          >
            Scan Passport
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-white/20 text-white hover:bg-white/10"
            onClick={() => navigate('/boarding-pass')}
          >
            Flight Registration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
