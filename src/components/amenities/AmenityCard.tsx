import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, MapPin } from "lucide-react";

interface Amenity {
  name: string;
  type: string;
  rating: number;
  openUntil: string;
  location: string;
  waitTime?: number;
  image?: string;
  isOpen: boolean;
}

interface AmenityCardProps {
  amenity: Amenity;
}

export const AmenityCard = ({ amenity }: AmenityCardProps) => {
  return (
    <Card className="shadow-card hover:shadow-aviation transition-all duration-300 overflow-hidden">
      <div className="h-24 bg-gradient-subtle relative">
        <div className="absolute inset-0 bg-gradient-aviation opacity-10"></div>
        <div className="absolute top-2 right-2">
          <Badge className={amenity.isOpen ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
            {amenity.isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-foreground">{amenity.name}</h4>
            <p className="text-sm text-muted-foreground">{amenity.type}</p>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-warning fill-current" />
              <span className="font-medium text-foreground">{amenity.rating}</span>
            </div>
            
            {amenity.waitTime && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{amenity.waitTime}min wait</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{amenity.location}</span>
            </div>
            
            <div className="text-muted-foreground">
              <Clock className="h-4 w-4 inline mr-1" />
              Until {amenity.openUntil}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};