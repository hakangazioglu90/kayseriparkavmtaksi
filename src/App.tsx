// src/App.tsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ensureAnonAuth } from "./firebase";
import Home from "./Pages/Home";
import Results from "./Pages/Results";
import Confirm from "./Pages/Confirm";
import Driver from "./Pages/Driver";
import ActiveVehicles from "./Pages/ActiveVehicles";

export default function App() {
  useEffect(() => { ensureAnonAuth(); }, []);

  return (
    <BrowserRouter>
      <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <Link to="/" style={{ fontWeight: 800, color: "#ff4d6d", textDecoration: "none" }}>
          KayseriPark AVM Taksi
        </Link>
        <Link to="/active">Active vehicles</Link>
        <Link to="/driver">Driver</Link>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/active" element={<ActiveVehicles />} />
        <Route path="/driver" element={<Driver />} />
      </Routes>
    </BrowserRouter>
  );
}
