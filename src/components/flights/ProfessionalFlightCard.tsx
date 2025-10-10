// src/components/flights/ProfessionalFlightCard.tsx
// ENHANCED FLIGHT CARD with premium design

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plane, 
  Clock, 
  MapPin, 
  Calendar,
  Users,
  Wifi,
  Coffee,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Flight {
  flightNumber: string;
  airline: string;
  destination: string;
  departure: string;
  gate: string;
  status: "on-time" | "delayed" | "boarding" | "departed";
  delay?: number;
  terminal?: string;
  aircraft?: string;
  duration?: string;
}

interface ProfessionalFlightCardProps {
  flight: Flight;
  isPriority?: boolean;
}

export const ProfessionalFlightCard = ({ flight, isPriority = false }: ProfessionalFlightCardProps) => {
  const navigate = useNavigate();

  const getStatusConfig = (status: string, delay?: number) => {
    switch (status) {
      case "on-time":
        return {
          color: "bg-emerald-500 text-white",
          icon: CheckCircle2,
          text: "On Time",
          bgColor: "from-emerald-50 to-green-50",
          borderColor: "border-emerald-200"
        };
      case "delayed":
        return {
          color: "bg-orange-500 text-white animate-pulse",
          icon: AlertCircle,
          text: delay ? `Delayed ${delay}min` : "Delayed",
          bgColor: "from-orange-50 to-amber-50",
          borderColor: "border-orange-200"
        };
      case "boarding":
        return {
          color: "bg-blue-500 text-white animate-pulse",
          icon: Plane,
          text: "Boarding Now",
          bgColor: "from-blue-50 to-indigo-50",
          borderColor: "border-blue-200"
        };
      case "departed":
        return {
          color: "bg-gray-400 text-white",
          icon: Plane,
          text: "Departed",
          bgColor: "from-gray-50 to-slate-50",
          borderColor: "border-gray-200"
        };
      default:
        return {
          color: "bg-gray-500 text-white",
          icon: Clock,
          text: status,
          bgColor: "from-gray-50 to-slate-50",
          borderColor: "border-gray-200"
        };
    }
  };

  const statusConfig = getStatusConfig(flight.status, flight.delay);
  const StatusIcon = statusConfig.icon;
  const isActive = flight.status === "boarding" || flight.status === "on-time";

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg bg-gradient-to-br ${statusConfig.bgColor} ${statusConfig.borderColor} ${
        isPriority ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      } ${
        isActive ? 'hover:scale-[1.02] shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={() => navigate('/boarding-pass', { state: { flight } })}
    >
      {/* Priority Badge */}
      {isPriority && (
        <div className="absolute top-2 left-2 z-10">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">
            Priority
          </Badge>
        </div>
      )}

      {/* Status Indicator Bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${
        flight.status === 'on-time' ? 'from-emerald-400 to-green-500' :
        flight.status === 'delayed' ? 'from-orange-400 to-red-500' :
        flight.status === 'boarding' ? 'from-blue-400 to-indigo-500' :
        'from-gray-300 to-gray-400'
      }`} />

      <CardContent className="p-5">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              flight.status === 'boarding' ? 'bg-blue-100' :
              flight.status === 'on-time' ? 'bg-emerald-100' :
              flight.status === 'delayed' ? 'bg-orange-100' :
              'bg-gray-100'
            }`}>
              <Plane className={`h-5 w-5 ${
                flight.status === 'boarding' ? 'text-blue-600' :
                flight.status === 'on-time' ? 'text-emerald-600' :
                flight.status === 'delayed' ? 'text-orange-600' :
                'text-gray-600'
              }`} />
            </div>
            <div>
              <div className="font-bold text-lg text-gray-900">{flight.flightNumber}</div>
              <div className="text-sm text-gray-600 font-medium">{flight.airline}</div>
              {flight.aircraft && (
                <div className="text-xs text-gray-500">{flight.aircraft}</div>
              )}
            </div>
          </div>
          
          <Badge className={`${statusConfig.color} font-semibold px-3 py-1 shadow-sm`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.text}
          </Badge>
        </div>

        {/* Flight Route */}
        <div className="flex items-center justify-center mb-4 py-3 bg-white/50 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider">From</div>
            <div className="font-bold text-gray-900">ORD</div>
            <div className="text-xs text-gray-600">Chicago</div>
          </div>
          
          <div className="flex-1 mx-4 flex items-center justify-center">
            <div className="w-full h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 relative">
              <Plane className="h-4 w-4 text-blue-500 absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 bg-white rounded-full p-0.5" />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider">To</div>
            <div className="font-bold text-gray-900">
              {flight.destination.includes('(') 
                ? flight.destination.match(/\(([^)]+)\)/)?.[1] || 'DEST'
                : flight.destination.substring(0, 3).toUpperCase()
              }
            </div>
            <div className="text-xs text-gray-600">
              {flight.destination.includes('(') 
                ? flight.destination.split('(')[0].trim()
                : flight.destination
              }
            </div>
          </div>
        </div>

        {/* Flight Details Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-3 w-3 text-gray-500 mr-1" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Departure</span>
            </div>
            <div className="font-bold text-gray-900">{flight.departure}</div>
            {flight.duration && (
              <div className="text-xs text-gray-500">{flight.duration}</div>
            )}
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <MapPin className="h-3 w-3 text-gray-500 mr-1" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Gate</span>
            </div>
            <div className="font-bold text-2xl text-gray-900">{flight.gate}</div>
            {flight.terminal && (
              <div className="text-xs text-gray-500">Terminal {flight.terminal}</div>
            )}
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-3 w-3 text-gray-500 mr-1" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Seat</span>
            </div>
            <div className="font-bold text-gray-900">12A</div>
            <div className="text-xs text-gray-500">Economy</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex space-x-4 text-xs text-gray-500">
            <div className="flex items-center">
              <Wifi className="h-3 w-3 mr-1" />
              <span>WiFi</span>
            </div>
            <div className="flex items-center">
              <Coffee className="h-3 w-3 mr-1" />
              <span>Food</span>
            </div>
            <div className="flex items-center">
              <ShoppingBag className="h-3 w-3 mr-1" />
              <span>Duty Free</span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2"
          >
            <span className="text-xs font-medium">View Details</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Boarding Status Bar */}
        {flight.status === 'boarding' && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 font-medium">🛫 Boarding in progress</span>
              <span className="text-blue-600 text-xs">Group 2 - Now boarding</span>
            </div>
          </div>
        )}

        {/* Delay Information */}
        {flight.status === 'delayed' && flight.delay && (
          <div className="mt-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-orange-700 font-medium">⏰ Delayed by {flight.delay} minutes</span>
              <span className="text-orange-600 text-xs">Weather related</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};