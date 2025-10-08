import { Routes, Route } from "react-router-dom";
// If you have a toaster or global UI, import it here
// import { Toaster } from "@/ui/toaster";

// Pages
import Home from "./pages/Home";
import Flights from "./pages/Flights";
import BoardingPass from "./pages/BoardingPass";
import WaitTimes from "./pages/WaitTimes";
import Map from "./pages/Map";
import More from "./pages/More";
import SmartPathEnroll from "./pages/SmartPathEnroll";
import NotFound from "./pages/NotFound";

// (Optional) If you have a header or bottom nav, import & render them outside <Routes>
// import { Header } from "@/components/core/Header";
// import { BottomNavigation } from "@/components/core/BottomNavigation";

export default function App() {
  return (
    <>
      {/* <Header /> */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flights" element={<Flights />} />
        <Route path="/boarding-pass" element={<BoardingPass />} />
        <Route path="/wait-times" element={<WaitTimes />} />
        <Route path="/map" element={<Map />} />
        <Route path="/more" element={<More />} />

        {/* ProPass Enrollment (the route your "Scan Passport" navigates to) */}
        <Route path="/smart-path/enroll" element={<SmartPathEnroll />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* <BottomNavigation /> */}
      {/* <Toaster /> */}
    </>
  );
}
