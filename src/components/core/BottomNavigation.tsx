import { Button } from "@/components/ui/button";
import { Home, Plane, Map, Clock, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: <Home className="h-5 w-5" />, label: "Home", path: "/" },
    { icon: <Plane className="h-5 w-5" />, label: "Flights", path: "/flights" },
    { icon: <Map className="h-5 w-5" />, label: "Map", path: "/map" },
    { icon: <Clock className="h-5 w-5" />, label: "Wait Times", path: "/wait-times" },
    { icon: <Settings className="h-5 w-5" />, label: "More", path: "/more" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-card z-50 max-w-sm mx-auto">
      {/* Mobile-optimized bottom navigation */}
      <div className="grid grid-cols-5 h-20 safe-area-pb">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className={`h-full rounded-none flex-col gap-1.5 text-xs transition-all duration-200 touch-manipulation min-h-[44px] ${
                isActive 
                  ? "text-primary bg-primary/10 scale-105" 
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`font-medium transition-all duration-200 ${
                isActive ? 'text-[10px] font-semibold' : 'text-[10px]'
              }`}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};