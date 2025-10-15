import { Routes, Route } from "react-router-dom";
// Pages
import Home from "./pages/Home";
import Flights from "./pages/Flights";
import BoardingPass from "./pages/BoardingPass";
import WaitTimes from "./pages/WaitTimes";
import Map from "./pages/Map";
import More from "./pages/More";
import NotFound from "./pages/NotFound";

// Professional Components
import ProfessionalPassportScanner from '@/components/passport/ProfessionalPassportScanner';
import EnhancedIdentityVerification from '@/components/identity/EnhancedIdentityVerification';
import NFCPassportReader from '@/components/identity/NFCPassportReader';

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
        
        {/* 🏆 PROFESSIONAL PASSPORT SCANNING ROUTES */}
        <Route path="/enroll" element={<ProfessionalPassportScanner />} />
        <Route path="/passport-scanner" element={<ProfessionalPassportScanner />} />
        <Route path="/identity-verification" element={<EnhancedIdentityVerification />} />
        <Route path="/nfc-scanner" element={<NFCPassportReader />} />
        <Route path="/scanner" element={<ProfessionalPassportScanner />} />
        
        {/* Catch all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}