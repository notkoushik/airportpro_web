import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'scan-passport',
    title: 'Scan Passport',
    description: 'Quick identity verification',
    icon: '📘',
    path: '/smart-path-enroll'
  },
  {
    id: 'check-flight',
    title: 'Check Flight',
    description: 'View flight status',
    icon: '✈️',
    path: '/flights'
  },
  {
    id: 'wait-times',
    title: 'Wait Times',
    description: 'Security & gate times',
    icon: '⏰',
    path: '/wait-times'
  },
  {
    id: 'airport-map',
    title: 'Airport Map',
    description: 'Navigate terminals',
    icon: '🗺️',
    path: '/map'
  }
];

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center text-center"
              onClick={() => navigate(action.path)}
            >
              <span className="text-2xl mb-2">{action.icon}</span>
              <div>
                <div className="font-medium text-sm">{action.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {action.description}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
