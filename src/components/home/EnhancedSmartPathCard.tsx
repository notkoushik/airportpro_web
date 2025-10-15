import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export const EnhancedSmartPathCard: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">ProPass Smart Path</CardTitle>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            Premium
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-white/90 mb-4">
          Skip security lines with biometric verification. Fast-track through the airport.
        </p>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            className="bg-white text-blue-600 hover:bg-white/90"
            onClick={() => navigate('/smart-path-enroll')}
          >
            Enroll Now
          </Button>
          <Button 
            variant="outline" 
            className="border-white/50 text-white hover:bg-white/10"
            onClick={() => navigate('/enhanced-smart-path-enroll')}
          >
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
