import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, CheckCircle, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BoardingPass {
  id: string;
  flightNumber: string;
  airline: string;
  from: string;
  to: string;
  date: string;
}

interface BoardingPassScannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BoardingPassScanner = ({ isOpen, onClose }: BoardingPassScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [boardingPasses, setBoardingPasses] = useState<BoardingPass[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  const generateMockBoardingPass = (): BoardingPass => {
    const airlines = ['AA', 'DL', 'UA', 'SW'];
    const airports = ['LAX', 'JFK', 'ORD', 'DFW', 'ATL', 'LAS'];
    const randomAirline = airlines[Math.floor(Math.random() * airlines.length)];
    const randomNumber = Math.floor(Math.random() * 9000) + 1000;
    const randomFrom = airports[Math.floor(Math.random() * airports.length)];
    let randomTo = airports[Math.floor(Math.random() * airports.length)];
    while (randomTo === randomFrom) {
      randomTo = airports[Math.floor(Math.random() * airports.length)];
    }
    
    return {
      id: Date.now().toString(),
      flightNumber: `${randomAirline} ${randomNumber}`,
      airline: randomAirline,
      from: randomFrom,
      to: randomTo,
      date: new Date().toLocaleDateString()
    };
  };

  const handleScan = () => {
    setIsScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      setIsScanned(true);
      const newBoardingPass = generateMockBoardingPass();
      setBoardingPasses(prev => [...prev, newBoardingPass]);
      toast({
        title: "Boarding Pass Scanned",
        description: `Flight ${newBoardingPass.flightNumber} registered successfully`,
      });
      setTimeout(() => {
        setIsScanned(false);
        setShowScanner(false);
      }, 2000);
    }, 2000);
  };

  const handleAddAnother = () => {
    setShowScanner(true);
  };

  const handleRemoveBoardingPass = (id: string) => {
    setBoardingPasses(prev => prev.filter(pass => pass.id !== id));
    toast({
      title: "Boarding Pass Removed",
      description: "Flight removed from registration",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Scan Boarding Pass
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Registered Boarding Passes List */}
          {boardingPasses.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Registered Flights ({boardingPasses.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {boardingPasses.map((pass) => (
                  <Card key={pass.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{pass.flightNumber}</p>
                        <p className="text-xs text-muted-foreground">{pass.from} → {pass.to}</p>
                        <p className="text-xs text-muted-foreground">{pass.date}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBoardingPass(pass.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Scanner or Add Button */}
          {showScanner ? (
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
              <CardContent className="p-8 text-center">
                {isScanned ? (
                  <div className="space-y-4">
                    <CheckCircle className="h-16 w-16 text-success mx-auto" />
                    <div>
                      <p className="font-semibold text-success">Successfully Scanned!</p>
                      <p className="text-sm text-muted-foreground">Flight registered to ProPass</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Camera className={`h-16 w-16 text-primary mx-auto ${isScanning ? 'animate-pulse' : ''}`} />
                      {isScanning && (
                        <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse"></div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <p className="font-semibold text-foreground">
                        {isScanning ? "Scanning..." : "Position boarding pass in frame"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Align the QR code with the camera frame
                      </p>
                    </div>
                    
                    {/* Scanner frame overlay */}
                    <div className="relative w-48 h-32 mx-auto border-2 border-primary rounded-lg bg-background/50">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                      
                      {isScanning && (
                        <div className="absolute inset-2 bg-primary/20 rounded animate-pulse"></div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Button onClick={handleAddAnother} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {boardingPasses.length === 0 ? 'Scan First Boarding Pass' : 'Add Another Boarding Pass'}
            </Button>
          )}
          
          {/* Scan Button */}
          {showScanner && !isScanned && !isScanning && (
            <div className="space-y-2">
              <Button onClick={handleScan} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Start Scanning
              </Button>
              <Button onClick={() => setShowScanner(false)} variant="outline" className="w-full">
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};