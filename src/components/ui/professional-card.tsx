import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Shield, 
  Award, 
  Clock, 
  AlertTriangle,
  Info
} from "lucide-react";

export type CardVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'premium';

interface ProfessionalCardProps {
  variant?: CardVariant;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  badge?: string;
  icon?: React.ComponentType<any>;
  className?: string;
}

const variantStyles: Record<CardVariant, {
  container: string;
  header: string;
  icon: React.ComponentType<any>;
  iconColor: string;
}> = {
  default: {
    container: "border-gray-200 bg-white",
    header: "bg-gray-50",
    icon: Info,
    iconColor: "text-gray-600"
  },
  success: {
    container: "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50",
    header: "bg-gradient-to-r from-green-500 to-green-600",
    icon: CheckCircle,
    iconColor: "text-white"
  },
  warning: {
    container: "border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50", 
    header: "bg-gradient-to-r from-yellow-500 to-orange-500",
    icon: AlertTriangle,
    iconColor: "text-white"
  },
  error: {
    container: "border-red-200 bg-gradient-to-br from-red-50 to-red-100",
    header: "bg-gradient-to-r from-red-500 to-red-600", 
    icon: AlertTriangle,
    iconColor: "text-white"
  },
  info: {
    container: "border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100",
    header: "bg-gradient-to-r from-blue-500 to-blue-600",
    icon: Info,
    iconColor: "text-white"
  },
  premium: {
    container: "border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 shadow-xl",
    header: "bg-gradient-to-r from-purple-600 to-purple-700",
    icon: Award,
    iconColor: "text-white"
  }
};

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({
  variant = 'default',
  title,
  subtitle,
  children,
  badge,
  icon: CustomIcon,
  className = ""
}) => {
  const styles = variantStyles[variant];
  const IconComponent = CustomIcon || styles.icon;

  return (
    <Card className={`${styles.container} ${className} overflow-hidden`}>
      <div className={`${styles.header} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              {subtitle && (
                <p className="text-white/80 text-sm">{subtitle}</p>
              )}
            </div>
          </div>
          {badge && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {badge}
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  );
};

// Data Display Components
export const DataField: React.FC<{
  label: string;
  value: string;
  icon?: React.ComponentType<any>;
  copyable?: boolean;
}> = ({ label, value, icon: Icon, copyable = false }) => {
  const handleCopy = () => {
    if (copyable) {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-gray-600" />}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p 
        className={`text-lg font-bold text-gray-900 ${copyable ? 'cursor-pointer hover:text-blue-600' : ''}`}
        onClick={handleCopy}
        title={copyable ? 'Click to copy' : ''}
      >
        {value}
      </p>
    </div>
  );
};

export const StatusIndicator: React.FC<{
  status: 'success' | 'warning' | 'error' | 'processing';
  label: string;
  description?: string;
}> = ({ status, label, description }) => {
  const statusConfig = {
    success: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
    warning: { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    error: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100' },
    processing: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100' }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} rounded-lg p-4 text-center`}>
      <Icon className={`w-8 h-8 ${config.color} mx-auto mb-2`} />
      <p className={`font-semibold ${config.color.replace('text-', 'text-').replace('-600', '-800')}`}>
        {label}
      </p>
      {description && (
        <p className={`text-sm mt-1 ${config.color.replace('-600', '-700')}`}>
          {description}
        </p>
      )}
    </div>
  );
};

// Professional Loading Component
export const ProfessionalLoader: React.FC<{
  message?: string;
  submessage?: string;
}> = ({ message = "Processing...", submessage }) => (
  <div className="text-center py-8">
    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
    <p className="text-lg font-medium text-gray-700 mb-1">{message}</p>
    {submessage && (
      <p className="text-sm text-gray-500">{submessage}</p>
    )}
  </div>
);

export default ProfessionalCard;