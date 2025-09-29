// COMPLETE APP.TSX - Create this file if it doesn't exist
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Flights from './pages/Flights'
import WaitTimes from './pages/WaitTimes'
import Map from './pages/Map'
import More from './pages/More'
import SmartPathEnroll from './pages/SmartPathEnroll'
import NotFound from './pages/NotFound'
import './App.css'

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flights" element={<Flights />} />
        <Route path="/wait-times" element={<WaitTimes />} />
        <Route path="/map" element={<Map />} />
        <Route path="/more" element={<More />} />
        <Route path="/smart-path/enroll" element={<SmartPathEnroll />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default App