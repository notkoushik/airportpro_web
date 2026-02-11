// src/components/flights/FlightCard.tsx
// COMPLETE FIXED VERSION - Matches GitHub repo exactly

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
        {/* Header with flight number and status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Plane className="h-4 w-4 text-blue-600" />
            <div>
              <div className="font-semibold text-sm">{flight.flightNumber}</div>
              <div className="text-xs text-muted-foreground">{flight.airline}</div>
            </div>
          </div>
          
          <Badge 
            className={getStatusColor(flight.status)}
            variant={flight.status === "on-time" ? "default" : "secondary"}
          >
            {getStatusText(flight.status, flight.delay)}
          </Badge>
        </div>

        {/* Flight details */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <div>
              <div className="font-medium">{flight.destination}</div>
              <div className="text-xs text-muted-foreground">Destination</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <div>
              <div className="font-medium">{flight.departure}</div>
              <div className="text-xs text-muted-foreground">Departure</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="font-medium">{flight.gate}</div>
            <div className="text-xs text-muted-foreground">Gate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};