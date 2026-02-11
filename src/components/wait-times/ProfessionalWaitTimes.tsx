// src/components/wait-times/ProfessionalWaitTimes.tsx
// ENHANCED WAIT TIMES with real-time updates

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Coffee, 
  Utensils, 
  ShoppingBag, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp, 
  Clock,
  MapPin,
  Users,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";

interface WaitTimeData {
  id: string;
  name: string;
  type: 'security' | 'food' | 'retail' | 'lounge';
  currentWait: number;
  previousWait: number;
  location: string;
  status: 'low' | 'medium' | 'high';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

export const ProfessionalWaitTimes = () => {
  const [waitTimes, setWaitTimes] = useState<WaitTimeData[]>([
    {
      id: '1',
      name: 'Security Checkpoint A',
      type: 'security',
      currentWait: 12,
      previousWait: 15,
      location: 'Terminal 1, Level 2',
      status: 'low',
      trend: 'down',
      lastUpdated: new Date(Date.now() - 2 * 60 * 1000)
    },
    {
      id: '2',
      name: 'Security Checkpoint B',
      type: 'security',
      currentWait: 18,
      previousWait: 12,
      location: 'Terminal 1, Level 2',
      status: 'medium',
      trend: 'up',
      lastUpdated: new Date(Date.now() - 1 * 60 * 1000)
    },
    {
      id: '3',
      name: 'Starbucks Coffee',
      type: 'food',
      currentWait: 5,
      previousWait: 8,
      location: 'Gate B12',
      status: 'low',
      trend: 'down',
      lastUpdated: new Date(Date.now() - 3 * 60 * 1000)
    },
    {
      id: '4',
      name: 'United Club Lounge',
      type: 'lounge',
      currentWait: 0,
      previousWait: 2,
      location: 'Terminal 1, Level 3',
      status: 'low',
      trend: 'down',
      lastUpdated: new Date(Date.now() - 5 * 60 * 1000)
    }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const getWaitTimeConfig = (status: string, waitTime: number) => {
    if (waitTime === 0) {
      return {
        bgColor: 'from-emerald-50 to-green-50',
        borderColor: 'border-emerald-200',
        badgeColor: 'bg-emerald-500 text-white',
        iconColor: 'text-emerald-600',
        label: 'No Wait'
      };
    }

    switch (status) {
      case 'low':
        return {
          bgColor: 'from-emerald-50 to-green-50',
          borderColor: 'border-emerald-200',
          badgeColor: 'bg-emerald-500 text-white',
          iconColor: 'text-emerald-600',
          label: 'Low'
        };
      case 'medium':
        return {
          bgColor: 'from-amber-50 to-orange-50',
          borderColor: 'border-amber-200',
          badgeColor: 'bg-amber-500 text-white',
          iconColor: 'text-amber-600',
          label: 'Moderate'
        };
      case 'high':
        return {
          bgColor: 'from-red-50 to-rose-50',
          borderColor: 'border-red-200',
          badgeColor: 'bg-red-500 text-white',
          iconColor: 'text-red-600',
          label: 'Busy'
        };
      default:
        return {
          bgColor: 'from-gray-50 to-slate-50',
          borderColor: 'border-gray-200',
          badgeColor: 'bg-gray-500 text-white',
          iconColor: 'text-gray-600',
          label: 'Unknown'
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security':
        return Shield;
      case 'food':
        return Coffee;
      case 'retail':
        return ShoppingBag;
      case 'lounge':
        return Users;
      default:
        return Clock;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Clock;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes === 0) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    return `${minutes} minutes ago`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Simulate API call
    setTimeout(() => {
      // Simulate updated wait times
      setWaitTimes(prev => prev.map(item => ({
        ...item,
        previousWait: item.currentWait,
        currentWait: Math.max(0, item.currentWait + Math.floor(Math.random() * 6) - 3),
        lastUpdated: new Date(),
        trend: Math.random() > 0.5 ? 'down' : 'up'
      })));
      
      setLastRefresh(new Date());
      setIsRefreshing(false);
    }, 1500);
  };

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const averageSecurityWait = Math.round(
    waitTimes
      .filter(item => item.type === 'security')
      .reduce((acc, item) => acc + item.currentWait, 0) / 
    waitTimes.filter(item => item.type === 'security').length
  );

  const averageRestaurantWait = Math.round(
    waitTimes
      .filter(item => item.type === 'food')
      .reduce((acc, item) => acc + item.currentWait, 0) / 
    Math.max(1, waitTimes.filter(item => item.type === 'food').length)
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">Security</span>
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-1">{averageSecurityWait}min</div>
            <div className="text-xs text-blue-600">Average Wait</div>
            <div className="flex items-center justify-center mt-2 text-xs">
              <TrendingDown className="h-3 w-3 text-emerald-500 mr-1" />
              <span className="text-emerald-600">vs last hour</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Coffee className="h-5 w-5 text-amber-600 mr-2" />
              <span className="text-sm font-medium text-amber-800">Dining</span>
            </div>
            <div className="text-3xl font-bold text-amber-900 mb-1">{averageRestaurantWait}min</div>
            <div className="text-xs text-amber-600">Average Wait</div>
            <div className="flex items-center justify-center mt-2 text-xs">
              <TrendingUp className="h-3 w-3 text-orange-500 mr-1" />
              <span className="text-orange-600">vs last hour</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Live Wait Times</h2>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          size="sm"
          variant="outline"
          className="bg-white hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </Button>
      </div>

      <div className="text-xs text-gray-500 flex items-center">
        <Clock className="h-3 w-3 mr-1" />
        Last updated: {formatTimeAgo(lastRefresh)}
      </div>

      {/* Wait Times Grid */}
      <div className="space-y-3">
        {waitTimes.map((item) => {
          const config = getWaitTimeConfig(item.status, item.currentWait);
          const TypeIcon = getTypeIcon(item.type);
          const TrendIcon = getTrendIcon(item.trend);

          return (
            <Card
              key={item.id}
              className={`transition-all duration-300 hover:shadow-md bg-gradient-to-br ${config.bgColor} ${config.borderColor}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-white/80 backdrop-blur-sm`}>
                      <TypeIcon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>
                    
                    <div>
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {item.location}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={config.badgeColor}>
                        {config.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {item.currentWait === 0 ? '0' : item.currentWait}
                          <span className="text-sm font-normal text-gray-600 ml-1">
                            {item.currentWait === 0 ? '' : 'min'}
                          </span>
                        </div>
                        
                        {item.previousWait !== item.currentWait && (
                          <div className={`text-xs flex items-center justify-end ${
                            item.trend === 'down' ? 'text-emerald-600' : 'text-orange-600'
                          }`}>
                            <TrendIcon className="h-3 w-3 mr-1" />
                            <span>
                              {item.trend === 'down' ? '-' : '+'}{Math.abs(item.currentWait - item.previousWait)}min
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(item.lastUpdated)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Tips */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-indigo-900 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs text-indigo-700">
            • Security Checkpoint A typically has shorter waits between 2-4 PM
          </div>
          <div className="text-xs text-indigo-700">
            • Premium lounges offer expedited security access
          </div>
          <div className="text-xs text-indigo-700">
            • Mobile ordering available at most restaurants to skip lines
          </div>
        </CardContent>
      </Card>
    </div>
  );
};