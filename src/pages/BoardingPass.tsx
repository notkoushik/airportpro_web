import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Clock, MapPin, QrCode, ArrowLeft, Users, Coffee } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

interface Flight {
  flightNumber: string;
  airline: string;
  destination: string;
  departure: string;
  gate: string;
  status: "on-time" | "delayed" | "boarding" | "departed";
  delay?: number;
  source?: string;
  boardingTime?: string;
  seat?: string;
  sequence?: string;
  group?: string;
}

const BoardingPass = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [flight, setFlight] = useState<Flight | null>(null);

  useEffect(() => {
    if (location.state?.flight) {
      setFlight(location.state.flight);
    } else {
      // Redirect back if no flight data
      navigate('/');
    }
  }, [location.state, navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-time":
        return "bg-success text-success-foreground";
      case "delayed":
        return "bg-warning text-warning-foreground";
      case "boarding":
        return "bg-primary text-primary-foreground animate-pulse-glow";
      case "departed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusText = (status: string, delay?: number) => {
    switch (status) {
      case "on-time":
        return "On Time";
      case "delayed":
        return delay ? `Delayed ${delay}min` : "Delayed";
      case "boarding":
        return "Boarding";
      case "departed":
        return "Departed";
      default:
        return status;
    }
  };

  if (!flight) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="p-4 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Digital Boarding Pass</h1>
        </div>

        {/* Boarding Pass */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  <span className="font-semibold">{flight.airline}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80">GATE</p>
                  <p className="text-xl font-bold">{flight.gate}</p>
                </div>
              </div>

              {/* Route */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-xs opacity-80">{flight.source || "CHICAGO-OHARE"}</p>
                    <p className="text-2xl font-bold">ORD</p>
                  </div>
                  <Plane className="h-6 w-6 rotate-90" />
                  <div className="text-center">
                    <p className="text-xs opacity-80">{flight.destination}</p>
                    <p className="text-2xl font-bold">NRT</p>
                  </div>
                </div>
              </div>

              {/* Flight Details Row */}
              <div className="grid grid-cols-5 gap-2 text-center">
                <div>
                  <p className="text-xs opacity-80">BOARDS</p>
                  <p className="text-sm font-bold">{flight.boardingTime || "11:30 AM"}</p>
                </div>
                <div>
                  <p className="text-xs opacity-80">FLIGHT</p>
                  <p className="text-sm font-bold">{flight.flightNumber}</p>
                </div>
                <div>
                  <p className="text-xs opacity-80">SEAT</p>
                  <p className="text-sm font-bold">{flight.seat || "2K"}</p>
                </div>
                <div>
                  <p className="text-xs opacity-80">SEQ</p>
                  <p className="text-sm font-bold">{flight.sequence || "303"}</p>
                </div>
                <div>
                  <p className="text-xs opacity-80">GROUP</p>
                  <p className="text-sm font-bold">{flight.group || "1"}</p>
                </div>
              </div>

              {/* Passenger and Status */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs opacity-80">PASSENGER</p>
                  <p className="font-semibold">ASKREN/TEST</p>
                  <Badge className={`${getStatusColor(flight.status)} text-xs`}>
                    {getStatusText(flight.status, flight.delay)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80">Premier Access</p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center pt-4 border-t border-white/20">
                <div className="bg-white p-4 rounded-lg">
                  <QrCode className="h-24 w-24 text-black" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Wait Times */}
        <Card className="bg-gradient-to-r from-warning/10 to-warning/5 border-warning/20 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-warning" />
              <h4 className="font-semibold text-foreground">Current Wait Times</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Security:</span>
                <span className="font-medium text-warning">15 min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gate {flight.gate}:</span>
                <span className="font-medium text-success">2 min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nearby Amenities */}
        <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20 shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-accent" />
              <h4 className="font-semibold text-foreground">Nearby Amenities</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-foreground">United Club Lounge - 2 min walk</span>
              </div>
              <div className="flex items-center gap-2">
                <Coffee className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-foreground">Starbucks - 1 min walk</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-foreground">Hudson News - 30 sec walk</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BoardingPass;