import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Coffee, ShoppingBag, Users } from "lucide-react";

interface WaitTime {
  location: string;
  type: "security" | "restaurant" | "shop" | "lounge";
  waitTime: number;
  capacity: "low" | "medium" | "high";
}

interface WaitTimeCardProps {
  waitTime: WaitTime;
}

export const WaitTimeCard = ({ waitTime }: WaitTimeCardProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "security":
        return <Shield className="h-8 w-8" />;
      case "restaurant":
        return <Coffee className="h-8 w-8" />;
      case "shop":
        return <ShoppingBag className="h-8 w-8" />;
      case "lounge":
        return <Users className="h-8 w-8" />;
      default:
        return <Users className="h-8 w-8" />;
    }
  };

  const getCapacityColor = (capacity: string) => {
    switch (capacity) {
      case "low":
        return "bg-green-500 text-white rounded-full px-3 py-1";
      case "medium":
        return "bg-orange-500 text-white rounded-full px-3 py-1";
      case "high":
        return "bg-red-500 text-white rounded-full px-3 py-1";
      default:
        return "bg-gray-500 text-white rounded-full px-3 py-1";
    }
  };

  const getCapacityText = (capacity: string) => {
    switch (capacity) {
      case "low":
        return "Low";
      case "medium":
        return "Busy";
      case "high":
        return "Very Busy";
      default:
        return capacity;
    }
  };

  const getWaitColor = (time: number) => {
    if (time <= 5) return "text-green-500";
    if (time <= 15) return "text-orange-500";
    return "text-red-500";
  };

  const getLocationName = (location: string) => {
    // Extract the main part of the location name
    if (location.includes("Checkpoint")) {
      return location.replace("Security ", "").replace("Checkpoint", "\nCheckpoint");
    }
    if (location.includes("TSA PreCheck")) {
      return "TSA\nPreCheck\nLane";
    }
    return location;
  };

  return (
    <Card className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden">
      <CardContent className="p-4 text-center">
        {/* Status Badge - positioned absolutely in top right */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-medium ${getCapacityColor(waitTime.capacity)}`}>
            {getCapacityText(waitTime.capacity)}
          </span>
        </div>
        
        {/* Icon */}
        <div className="mb-3 flex justify-center">
          <div className="p-3 bg-blue-500 rounded-xl text-white">
            {getIcon(waitTime.type)}
          </div>
        </div>
        
        {/* Location Name */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight whitespace-pre-line">
            {getLocationName(waitTime.location)}
          </h3>
          <p className="text-xs text-gray-500 capitalize mt-1">{waitTime.type}</p>
        </div>
        
        {/* Wait Time */}
        <div className="mt-4">
          <p className={`text-3xl font-bold ${getWaitColor(waitTime.waitTime)} mb-1`}>
            {waitTime.waitTime}min
          </p>
          <p className="text-xs text-gray-500">Wait Time</p>
        </div>
      </CardContent>
    </Card>
  );
};