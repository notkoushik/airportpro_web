import { Routes, Route } from "react-router-dom";
// Pages
import Home from "./pages/Home";
import Flights from "./pages/Flights";
import BoardingPass from "./pages/BoardingPass";
import WaitTimes from "./pages/WaitTimes";
import Map from "./pages/Map";
import More from "./pages/More";
import NotFound from "./pages/NotFound";

// Real OCR Scanner Components
import FixedOCRPassportScanner from '@/components/passport/FixedOCRPassportScanner';
import AdvancedLivenessDetector from '@/components/liveness/AdvancedLivenessDetector';
import EnhancedIdentityVerification from '@/components/identity/EnhancedIdentityVerification';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flights" element={<Flights />} />
        <Route path="/boarding-pass" element={<BoardingPass />} />
        <Route path="/wait-times" element={<WaitTimes />} />
        <Route path="/map" element={<Map />} />
        <Route path="/more" element={<More />} />
        <Route path="/scanner" element={<FixedOCRPassportScanner />} />
<Route path="/liveness" element={<AdvancedLivenessDetector />} />
<Route path="/biometric-verification" element={<AdvancedLivenessDetector />} />
        
        {/* 🏆 REAL OCR PASSPORT SCANNING ROUTES */}
        <Route path="/enroll" element={<RealOCRPassportScanner />} />
        <Route path="/passport-scanner" element={<RealOCRPassportScanner />} />
        <Route path="/identity-verification" element={<EnhancedIdentityVerification />} />
        <Route path="/scanner" element={<RealOCRPassportScanner />} />
        
        {/* Catch all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}