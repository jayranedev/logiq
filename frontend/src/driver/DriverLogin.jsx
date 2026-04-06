import { useState } from "react";
import { Truck, Phone, Lock, ChevronRight, Loader2, Package } from "lucide-react";
import { warehouseApi } from "../services/api";

const VEHICLES = [
  { id: "bike",   label: "Bike",   cap: "15kg" },
  { id: "scooter",label: "Scooter",cap: "20kg" },
  { id: "van",    label: "Van",    cap: "100kg" },
  { id: "truck",  label: "Truck",  cap: "500kg" },
];

export default function DriverLogin({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState(null); // shown after register
  const [form, setForm] = useState({ name: "", phone: "", vehicle_type: "bike" });
  const [loginForm, setLoginForm] = useState({ phone: "", pin: "" });

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await warehouseApi.login(loginForm.phone, loginForm.pin);
      onLogin(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid phone or PIN");
    }
    setLoading(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await warehouseApi.register(form);
      setPin(data.pin);
      setLoginForm({ phone: form.phone, pin: data.pin });
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Brand */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Truck size={28} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-wider text-white">
            LOGIQ<span className="text-blue-500">.AI</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Driver Portal</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex w-full bg-slate-900 border border-slate-800 rounded-2xl p-1 mb-6">
        {["login", "register"].map(m => (
          <button key={m} onClick={() => { setMode(m); setError(""); setPin(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              mode === m ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300"
            }`}>
            {m === "login" ? "Log In" : "Sign Up"}
          </button>
        ))}
      </div>

      {/* PIN reveal after register */}
      {pin && (
        <div className="w-full bg-emerald-950 border border-emerald-700 rounded-2xl p-5 mb-5 text-center">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">Your PIN — Save It!</p>
          <p className="text-4xl font-black text-white tracking-[0.3em]">{pin}</p>
          <p className="text-slate-400 text-xs mt-2">Use this + your phone to log in</p>
          <button onClick={() => { setMode("login"); setPin(null); }}
            className="mt-4 bg-blue-600 text-white text-sm font-bold px-6 py-2 rounded-xl">
            Log In Now →
          </button>
        </div>
      )}

      {error && (
        <div className="w-full bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Login form */}
      {mode === "login" ? (
        <form onSubmit={handleLogin} className="w-full space-y-4">
          <Field icon={Phone} label="Phone" value={loginForm.phone}
            onChange={v => setLoginForm(f => ({ ...f, phone: v }))}
            placeholder="+91 98765 43210" type="tel" />
          <Field icon={Lock} label="PIN" value={loginForm.pin}
            onChange={v => setLoginForm(f => ({ ...f, pin: v }))}
            placeholder="6-digit PIN" type="password" maxLength={6} />
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50 mt-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Log In <ChevronRight size={18} /></>}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="w-full space-y-4">
          <Field icon={Package} label="Full Name" value={form.name}
            onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Your name" />
          <Field icon={Phone} label="Phone" value={form.phone}
            onChange={v => setForm(f => ({ ...f, phone: v }))}
            placeholder="+91 98765 43210" type="tel" />
          <div className="space-y-2">
            <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest">Vehicle</label>
            <div className="grid grid-cols-4 gap-2">
              {VEHICLES.map(v => (
                <button key={v.id} type="button" onClick={() => setForm(f => ({ ...f, vehicle_type: v.id }))}
                  className={`py-2.5 rounded-xl border text-center transition-colors ${
                    form.vehicle_type === v.id
                      ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                      : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}>
                  <div className="text-xs font-bold">{v.label}</div>
                  <div className="text-[10px] opacity-60">{v.cap}</div>
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, placeholder, type = "text", maxLength }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 focus-within:border-blue-500/50 transition-colors">
        <Icon size={15} className="text-slate-600 shrink-0" />
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          type={type} maxLength={maxLength} autoCapitalize="none"
          className="flex-1 py-3.5 bg-transparent text-sm text-white placeholder-slate-600 outline-none" />
      </div>
    </div>
  );
}
