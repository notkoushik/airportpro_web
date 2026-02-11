import React from "react"; // <--- Add this import
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

interface EnhancedSmartPathCardProps {
  title?: string;
  description?: string;
  buttonText?: string;
  to?: string;
}

// Explicitly type the component as a React.FC that uses the props interface
export const EnhancedSmartPathCard: React.FC<EnhancedSmartPathCardProps> = ({
  title = "Your Digital Identity",
  description = "Scan your passport to get started",
  buttonText = "Start Scanning",
  to = "/enroll", // Note: The default is still here, but will be overridden
}) => {
  return (
    <Card className="bg-white shadow-lg rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50 p-4">
        <CardTitle className="text-base font-semibold text-gray-800">
          {title}
        </CardTitle>
        <ShieldCheck className="h-5 w-5 text-blue-500" />
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <Link to={to} className="w-full">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};