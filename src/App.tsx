import { Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import Flights from "./pages/Flights";
import BoardingPass from "./pages/BoardingPass";
import WaitTimes from "./pages/WaitTimes";
import Map from "./pages/Map";
import More from "./pages/More";
import NotFound from "./pages/NotFound";
import EnhancedSmartPathEnroll from './pages/EnhancedSmartPathEnroll'; // The correct enrollment page

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

        {/* This is the corrected route for the passport scanning flow */}
        <Route path="/smart-path-enroll" element={<EnhancedSmartPathEnroll />} />

        {/* This will catch any page that doesn't exist */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}