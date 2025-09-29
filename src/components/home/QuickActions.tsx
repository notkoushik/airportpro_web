import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Map, Wifi, Car, Phone, Navigation, Star, Luggage, MapPin, MessageCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const QuickActions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleActionClick = (label: string) => {
    switch (label) {
      case "Terminal Map":
        navigate("/map");
        break;
      case "Navigation":
        toast({
          title: "Navigation",
          description: "GPS navigation activated",
        });
        break;
      case "Free WiFi":
        toast({
          title: "WiFi Connected",
          description: "Connected to LAX-Free-WiFi",
        });
        break;
      case "Parking":
        toast({
          title: "Parking Info",
          description: "Level 2: 45 spots available",
        });
        break;
      case "Lounges":
        toast({
          title: "Lounges",
          description: "3 lounges available in Terminal 3",
        });
        break;
      case "Support":
        toast({
          title: "Support",
          description: "Connecting to customer service...",
        });
        break;
      case "Baggage Tracking":
        toast({
          title: "Baggage Tracking",
          description: "Your baggage is at Terminal 3 Carousel B",
        });
        break;
      case "Find Gate":
        toast({
          title: "Find Gate",
          description: "Gate A12 is 5 minutes walk from here",
        });
        break;
      case "Live Chat Support":
        toast({
          title: "Live Chat",
          description: "Chat support is now available",
        });
        break;
      default:
        toast({
          title: label,
          description: "Feature activated",
        });
    }
  };

  const actions = [
    { icon: <Luggage className="h-5 w-5" />, label: "Baggage Tracking", color: "bg-primary" },
    { icon: <MapPin className="h-5 w-5" />, label: "Find Gate", color: "bg-accent" },
    { icon: <MessageCircle className="h-5 w-5" />, label: "Live Chat Support", color: "bg-success" },
    { icon: <CheckCircle className="h-5 w-5" />, label: "Check-in", color: "bg-warning" },
  ];

  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              onClick={() => handleActionClick(action.label)}
              className="h-auto flex-col gap-2 p-3 hover:shadow-aviation transition-all duration-300"
            >
              <div className={`p-2 rounded-lg ${action.color} text-white`}>
                {action.icon}
              </div>
              <span className="text-xs text-foreground font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};