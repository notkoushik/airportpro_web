// This page component is obsolete as it depended on removed plugin logic.
// The content has been simplified to prevent build errors.

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Keep UI imports if needed for layout

const EnhancedSmartPathEnroll: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
       <Card>
         <CardHeader>
           <CardTitle>Enrollment Unavailable</CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-red-600 font-semibold">
             This enrollment process (EnhancedSmartPathEnroll) is currently unavailable or obsolete due to code refactoring.
           </p>
           {/* You might want to add a button to navigate back or to the correct enrollment flow */}
         </CardContent>
       </Card>
    </div>
  );
};

export default EnhancedSmartPathEnroll;