import { Routes, Route } from "react-router-dom";
// Pages
import Home from "./pages/Home";
import Flights from "./pages/Flights";
import BoardingPass from "./pages/BoardingPass";
import WaitTimes from "./pages/WaitTimes";
import Map from "./pages/Map";
import More from "./pages/More";
import NotFound from "./pages/NotFound";
// REMOVED: import EnhancedSmartPathEnroll from './pages/EnhancedSmartPathEnroll';
import PassportScanner from '@/components/passport/PassportScanner';  // ✅ Use working scanner
import NFCPassportReader from '@/components/identity/Scanner';

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
        
        {/* ✅ FIXED: Route /enroll to working PassportScanner */}
        <Route path="/enroll" element={<PassportScanner />} />
        <Route path="/passport-scanner" element={<PassportScanner />} />
        <Route path="/nfc-scanner" element={<NFCPassportReader />} />
        <Route path="/scanner" element={<NFCPassportReader />} />
        
        {/* This will catch any page that doesn't exist */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}