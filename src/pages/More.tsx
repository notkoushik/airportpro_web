import { Header } from "@/components/core/Header";
import { BottomNavigation } from "@/components/core/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  HelpCircle, 
  Star,
  CreditCard,
  Globe,
  Moon,
  Smartphone,
  ChevronRight,
  type LucideProps
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, type ForwardRefExoticComponent, type RefAttributes } from "react";

// 1. DEFINE A TYPE FOR OUR SETTINGS
// We create a type to describe the shape of each setting item.
// Note that `toggle` is marked with a `?`, making it optional.
type SettingItem = {
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
  label: string;
  badge: string | null;
  toggle?: boolean; // This property is now optional
};

const More = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const handleEditProfile = () => {
    toast({
      title: "Edit Profile",
      description: "Profile editing opened",
    });
  };

  const handleSettingClick = (label: string) => {
    toast({
      title: label,
      description: `${label} settings opened`,
    });
  };

  const handleAppAction = (action: string) => {
    toast({
      title: action,
      description: `${action} functionality activated`,
    });
  };

  // 2. APPLY THE TYPE TO THE ARRAY
  // This tells TypeScript that each group's `items` array will contain objects
  // that match the `SettingItem` type we defined above.
  const settingsGroups: { title: string; items: SettingItem[] }[] = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile Settings", badge: null },
        { icon: CreditCard, label: "Payment Methods", badge: "2" },
        { icon: Star, label: "Frequent Flyer", badge: "Gold" },
      ]
    },
    {
      title: "Preferences",
      items: [
        { icon: Bell, label: "Notifications", badge: null, toggle: true },
        { icon: Globe, label: "Language", badge: "English" },
        { icon: Moon, label: "Dark Mode", badge: null, toggle: true },
        { icon: Smartphone, label: "Offline Mode", badge: null, toggle: true },
      ]
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", badge: null },
        { icon: Shield, label: "Privacy Policy", badge: null },
        { icon: Settings, label: "App Settings", badge: null },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header />
      
      <main className="p-4 space-y-6">
        {/* User Profile Card */}
        <Card className="shadow-aviation">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-aviation rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">John Traveler</h3>
                <p className="text-muted-foreground">john.traveler@email.com</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-warning text-warning-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    Gold Member
                  </Badge>
                  <Badge variant="outline">
                    127 Flights
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleEditProfile}>
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">12</p>
              <p className="text-sm text-muted-foreground">This Year</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">3.2k</p>
              <p className="text-sm text-muted-foreground">Miles</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">94%</p>
              <p className="text-sm text-muted-foreground">On Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <Card key={groupIndex} className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">{group.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {group.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={itemIndex} 
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                    onClick={() => !item.toggle && handleSettingClick(item.label)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge 
                          variant={item.badge === "Gold" ? "default" : "outline"}
                          className={item.badge === "Gold" ? "bg-warning text-warning-foreground" : ""}
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {item.toggle ? (
                        <Switch 
                          checked={item.label === "Notifications" ? notifications : 
                                  item.label === "Dark Mode" ? darkMode : offlineMode}
                          onCheckedChange={(checked: boolean) => { // 3. ADDED TYPE FOR 'checked'
                            if (item.label === "Notifications") setNotifications(checked);
                            else if (item.label === "Dark Mode") setDarkMode(checked);
                            else setOfflineMode(checked);
                            toast({
                              title: `${item.label} ${checked ? 'Enabled' : 'Disabled'}`,
                              description: `${item.label} has been ${checked ? 'turned on' : 'turned off'}`,
                            });
                          }}
                        />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* App Info */}
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-gradient-aviation rounded-lg">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-foreground">AirportPro</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Version 2.1.0</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => handleAppAction("Rate App")}>Rate App</Button>
              <Button variant="outline" size="sm" onClick={() => handleAppAction("Share")}>Share</Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default More;
