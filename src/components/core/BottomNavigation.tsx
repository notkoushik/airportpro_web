import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/flights', label: 'Flights', icon: '✈️' },
  { path: '/boarding-pass', label: 'Boarding', icon: '🎫' },
  { path: '/wait-times', label: 'Wait Times', icon: '⏰' },
  { path: '/more', label: 'More', icon: '⋯' },
];

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant={location.pathname === item.path ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center p-2 min-w-0 flex-1"
            onClick={() => navigate(item.path)}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs mt-1 truncate">{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
};
