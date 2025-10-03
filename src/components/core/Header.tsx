import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, User, Plane, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the types for the props. All are optional.
interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

// This is the unified Header component
export const Header = ({ title, showBackButton = false }: HeaderProps) => {
  const navigate = useNavigate();
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

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  // If a 'title' prop is provided, render the simple inner page header.
  if (title) {
    return (
      <header className="relative flex items-center justify-center py-4 border-b">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="absolute left-0 p-2 rounded-full hover:bg-secondary"
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-xl font-bold text-center">{title}</h1>
      </header>
    );
  }

  // Otherwise, render the main header for the home screen.
  return (
    <header className="bg-gradient-aviation text-white p-4 shadow-aviation">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Plane className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AirportPro</h1>
            <p className="text-sm opacity-90">LAX Terminal 3</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 relative"
            onClick={handleNotifications}
          >
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 bg-red-500 text-white text-xs">
              2
            </Badge>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={handleProfile}
          >
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};


