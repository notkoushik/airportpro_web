import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  MapPin, 
  Plane,
  ArrowRight,
  Calendar
} from "lucide-react";

interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    code: string;
    time: string;
    gate?: string;
  };
  arrival: {
    airport: string;
    code: string;
    time: string;
    gate?: string;
  };
  status: 'on-time' | 'delayed' | 'boarding' | 'departed';
  duration: string;
  date: string;
}

interface FlightCardProps {
  flight: Flight;
  className?: string;
}

export const FlightCard: React.FC<FlightCardProps> = ({ 
  flight, 
  className = "" 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'bg-success text-success-foreground';
      case 'delayed': return 'bg-warning text-warning-foreground';
      case 'boarding': return 'bg-primary text-primary-foreground animate-pulse';
      case 'departed': return 'bg-muted text-muted-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on-time': return 'On Time';
      case 'delayed': return 'Delayed';
      case 'boarding': return 'Boarding';
      case 'departed': return 'Departed';
      default: return 'Unknown';
    }
  };

  return (
    <Card className={`
      bg-card-gradient border-primary/10 shadow-aviation hover:shadow-card-hover 
      transition-all duration-300 hover:scale-[1.02] ${className}
    `}>
      <CardContent className="p-6">
        {/* Header with flight info and status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-card-foreground">
                {flight.flightNumber}
              </h3>
              <p className="text-sm text-muted-foreground">{flight.airline}</p>
            </div>
          </div>
          <Badge className={getStatusColor(flight.status)}>
            {getStatusText(flight.status)}
          </Badge>
        </div>

        {/* Flight route */}
        <div className="grid grid-cols-5 items-center gap-2 mb-4">
          {/* Departure */}
          <div className="col-span-2 text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-bold text-lg">{flight.departure.code}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {flight.departure.airport}
            </p>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-medium">{flight.departure.time}</span>
            </div>
            {flight.departure.gate && (
              <p className="text-xs text-muted-foreground">Gate {flight.departure.gate}</p>
            )}
          </div>

          {/* Flight path */}
          <div className="col-span-1 flex flex-col items-center">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div className="flex-1 h-px bg-gradient-to-r from-primary via-primary/50 to-primary"></div>
              <ArrowRight className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{flight.duration}</p>
          </div>

          {/* Arrival */}
          <div className="col-span-2 text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-bold text-lg">{flight.arrival.code}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {flight.arrival.airport}
            </p>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-medium">{flight.arrival.time}</span>
            </div>
            {flight.arrival.gate && (
              <p className="text-xs text-muted-foreground">Gate {flight.arrival.gate}</p>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center justify-center space-x-1 pt-2 border-t border-primary/10">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{flight.date}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlightCard;