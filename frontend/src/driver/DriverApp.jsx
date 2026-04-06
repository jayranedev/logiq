/**
 * LOGIQ.AI — Driver Web App
 * Mobile-optimized PWA at /driver
 * Screens: Login → Orders → Scan → Status
 */
import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import DriverLogin from "./DriverLogin";
import DriverOrders from "./DriverOrders";
import DriverScan from "./DriverScan";
import DriverStatus from "./DriverStatus";

const SESSION_KEY = "logiq_driver_session";

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export default function DriverApp() {
  const [session, setSession] = useState(() => getSession());
  const navigate = useNavigate();

  function handleLogin(data) {
    saveSession(data);
    setSession(data);
    navigate("/driver/orders");
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    navigate("/driver");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 max-w-md mx-auto relative">
      <Routes>
        <Route path="/" element={
          session ? <Navigate to="/driver/orders" replace /> : <DriverLogin onLogin={handleLogin} />
        } />
        <Route path="/orders" element={
          session ? <DriverOrders session={session} onLogout={handleLogout} /> : <Navigate to="/driver" replace />
        } />
        <Route path="/scan" element={
          session ? <DriverScan session={session} /> : <Navigate to="/driver" replace />
        } />
        <Route path="/status/:orderId" element={
          session ? <DriverStatus session={session} /> : <Navigate to="/driver" replace />
        } />
        <Route path="*" element={<Navigate to="/driver" replace />} />
      </Routes>
    </div>
  );
}
