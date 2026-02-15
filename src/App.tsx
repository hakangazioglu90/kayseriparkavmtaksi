import { useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Pages/Home";
import Results from "./Pages/Results";
import Confirm from "./Pages/Confirm";
import ActiveVehicles from "./Pages/ActiveVehicles";

export default function App() {
  const allowAccess = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("dev") === "1";
  }, []);

  if (!allowAccess) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#ffffff",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 36, marginBottom: 16 }}>
          KayseriPark AVM Taksi
        </h1>

        <p style={{ fontSize: 18, opacity: 0.7, marginBottom: 24 }}>
          We are currently under construction.
        </p>

        <p style={{ fontSize: 14, opacity: 0.5 }}>
          Coming soon.
        </p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/results" element={<Results />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/active" element={<ActiveVehicles />} />
      </Routes>
    </BrowserRouter>
  );
}
