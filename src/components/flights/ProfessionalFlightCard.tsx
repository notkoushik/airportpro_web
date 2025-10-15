import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FlightData {
  flightNumber: string;
  airline: string;
  destination: string;
  departure: string;
  gate: string;
  status: 'on-time' | 'delayed' | 'boarding' | 'departed';
}

interface ProfessionalFlightCardProps {
  flight: FlightData;
}

const getStatusColor = (status: FlightData['status']) => {
  switch (status) {
    case 'on-time': return 'bg-green-100 text-green-800';
    case 'delayed': return 'bg-red-100 text-red-800';
    case 'boarding': return 'bg-blue-100 text-blue-800';
    case 'departed': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const ProfessionalFlightCard: React.FC<ProfessionalFlightCardProps> = ({ 
  flight 
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="font-semibold text-lg">{flight.flightNumber}</h4>
            <p className="text-sm text-muted-foreground">{flight.airline}</p>
          </div>
          <Badge className={getStatusColor(flight.status)}>
            {flight.status.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <p className="text-xs text-muted-foreground">Destination</p>
            <p className="font-medium">{flight.destination}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Departure</p>
            <p className="font-medium">{flight.departure}</p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Gate</p>
              <p className="font-bold text-lg">{flight.gate}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Terminal</p>
              <p className="font-medium">A</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
