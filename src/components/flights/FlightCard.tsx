// Fixed FlightCard.tsx - Corrected import paths and added proper CSS classes
// Place this in: src/components/flights/FlightCard.tsx

import { Badge } from "@/components/ui/badge";  // FIXED: Correct import path
import { Card, CardContent } from "@/components/ui/card";  // FIXED: Correct import path
import { Plane, Clock, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Flight {
  flightNumber: string;
  airline: string;
  destination: string;
  departure: string;
  gate: string;
  status: "on-time" | "delayed" | "boarding" | "departed";
  delay?: number;
}

interface FlightCardProps {
  flight: Flight;
}

export const FlightCard = ({ flight }: FlightCardProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-time":
        return "bg-success text-success-foreground";  // FIXED: Uses proper CSS classes
      case "delayed":
        return "bg-warning text-warning-foreground";  // FIXED: Uses proper CSS classes
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

  // Determine if this is a boarding flight for special styling
  const isBoarding = flight.status === "boarding";

  return (
    <Card 
      className={`flight-card cursor-pointer transition-aviation ${
        isBoarding ? "flight-card-boarding" : ""
      }`}
      onClick={() => navigate('/boarding-pass', { state: { flight } })}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <div>
              <div className="font-semibold text-base">{flight.flightNumber}</div>
              <div className="text-sm text-muted-foreground">{flight.airline}</div>
            </div>
          </div>
          <Badge 
            className={getStatusColor(flight.status)}
            variant={flight.status === "on-time" ? "default" : "secondary"}
          >
            {getStatusText(flight.status, flight.delay)}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <div>
              <div className="font-medium">{flight.destination}</div>
              <div className="text-muted-foreground text-xs">Destination</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <div>
              <div className="font-medium">{flight.departure}</div>
              <div className="text-muted-foreground text-xs">Departure</div>
            </div>
          </div>

          <div>
            <div className="font-medium">{flight.gate}</div>
            <div className="text-muted-foreground text-xs">Gate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};