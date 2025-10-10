// src/components/core/Header.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, User, Plane } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const Header = () => {
  const { toast } = useToast();

  const handleNotifications = () => {
    toast({
      title: "Notifications",
      description: "You have 2 new notifications",
    });
  };

  const handleProfile = () => {
    toast({
      title: "Profile", 
      description: "Profile settings opened",
    });
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center space-x-2">
        <Plane className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold">AirportPro</h1>
        <Badge variant="outline" className="text-xs">BETA</Badge>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={handleNotifications}>
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleProfile}>
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};
