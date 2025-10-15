import { Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import Flights from "./pages/Flights";
import BoardingPass from "./pages/BoardingPass";
import WaitTimes from "./pages/WaitTimes";
import Map from "./pages/Map";
import More from "./pages/More";
import NotFound from "./pages/NotFound";
import EnhancedSmartPathEnroll from './pages/EnhancedSmartPathEnroll';
import PassportScanner   from '@/components/passport/PassportScanner';
import NFCPassportReader from '@/components/identity/Scanner'; // This is the correct component

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
        <Route path="/"                 element={<Home />} />
        <Route path="/enroll"           element={<EnhancedSmartPathEnroll />} />
        <Route path="/passport-scanner" element={<PassportScanner />} />
        <Route path="/nfc-scanner"      element={<NFCPassportReader />} />
        <Route path="*"                 element={<NotFound />} />

        {/* This is the corrected route. 
          The URL from the button now correctly loads the Enhanced component.
        */}
        <Route path="/smart-path/enroll" element={<EnhancedSmartPathEnroll />} />

        {/* This will catch any page that doesn't exist */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}