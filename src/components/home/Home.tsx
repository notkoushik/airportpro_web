import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Plane, Shield, Scan, Nfc } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AirportPro</h1>
          <p className="text-lg text-gray-700">Smart Airport Security & Biometric Verification</p>
        </div>

        {/* ProPass Smart Path Card */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-2xl mb-2">ProPass Smart Path</CardTitle>
                <CardDescription className="text-blue-100 text-base">
                  Skip security lines with biometric verification. Fast-track through the airport.
                </CardDescription>
              </div>
              <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                <span className="text-white text-sm font-medium">Premium</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-3">
              <Button 
                onClick={() => navigate('/enroll')}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Enroll Now
              </Button>
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-blue-600"
              >
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Scan className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-gray-900">Passport Scan</CardTitle>
                  <CardDescription className="text-gray-600">MRZ & Photo Recognition</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/passport-scanner')}
                className="w-full"
              >
                Scan Passport
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Nfc className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-gray-900">NFC Verification</CardTitle>
                  <CardDescription className="text-gray-600">Chip Authentication</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/nfc-scanner')}
                variant="outline" 
                className="w-full"
              >
                NFC Scan
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* My Flights Section */}
        <Card className="bg-gray-900 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">My Flights</CardTitle>
              <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">2 Active</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Flight 1 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-semibold text-lg">UA 482</h3>
                  <p className="text-gray-300">United Airlines</p>
                </div>
                <span className="bg-green-600 px-2 py-1 rounded text-xs text-white">ON TIME</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Destination</p>
                  <p className="text-white font-medium">Tokyo (NRT)</p>
                </div>
                <div>
                  <p className="text-gray-400">Departure</p>
                  <p className="text-white font-medium">12:05 PM</p>
                </div>
                <div>
                  <p className="text-gray-400">Gate</p>
                  <p className="text-white font-medium">C12</p>
                </div>
                <div>
                  <p className="text-gray-400">Terminal</p>
                  <p className="text-white font-medium">A</p>
                </div>
              </div>
            </div>

            {/* Flight 2 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-semibold text-lg">DL 5678</h3>
                  <p className="text-gray-300">Delta Air Lines</p>
                </div>
                <span className="bg-green-600 px-2 py-1 rounded text-xs text-white">ON TIME</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Destination</p>
                  <p className="text-white font-medium">Chicago ORD</p>
                </div>
                <div>
                  <p className="text-gray-400">Departure</p>
                  <p className="text-white font-medium">4:20 PM</p>
                </div>
                <div>
                  <p className="text-gray-400">Gate</p>
                  <p className="text-white font-medium">B8</p>
                </div>
                <div>
                  <p className="text-gray-400">Terminal</p>
                  <p className="text-white font-medium">A</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;