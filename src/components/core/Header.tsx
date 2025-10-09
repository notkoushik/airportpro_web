import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Header: React.FC = () => {
  return (
    <Card className="bg-aviation-gradient text-white shadow-aviation border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold tracking-tight">
            AirportPro
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm opacity-90">Connected</span>
          </div>
        </div>
        <p className="text-white/80 text-sm">
          Your seamless travel companion
        </p>
      </CardHeader>
    </Card>
  );
};

export default Header;