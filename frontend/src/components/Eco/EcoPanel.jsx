import { useEffect, useState } from "react";
import { Leaf, Zap, TrendingDown, Award, RefreshCw, Loader2 } from "lucide-react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";
import api from "../../services/api";

const GRADE_COLOR = { A: "#10b981", B: "#34d399", C: "#f59e0b", D: "#f97316", F: "#ef4444" };
const GRADE_BG    = { A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", B: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30", C: "bg-amber-500/20 text-amber-400 border-amber-500/30", D: "bg-orange-500/20 text-orange-400 border-orange-500/30", F: "bg-red-500/20 text-red-400 border-red-500/30" };

export default function EcoPanel() {
  const [live, setLive]       = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ecoMode, setEcoMode] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [liveData, sumData] = await Promise.all([
        api.get("/api/ecoscore/live").then(r => r.data),
        api.get("/api/ecoscore/fleet/summary").then(r => r.data),
      ]);
      setLive(liveData);
      setSummary(sumData);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const grade = summary?.fleet_eco_grade || "B";
  const co2Total = summary?.total_co2_kg || 0;
  const co2Saved = summary?.co2_saved_kg || 0;
  const savingsPct = summary?.savings_pct || 0;
  const trees = summary?.co2_saved_trees_equivalent || 0;

  // Radial chart data: green portion = savings %
  const radialData = [{ name: "CO₂", value: Math.max(5, savingsPct), fill: GRADE_COLOR[grade] || "#10b981" }];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Leaf size={15} className="text-emerald-400" />
          <span className="text-sm font-semibold text-slate-100">EcoScore™</span>
          <span className="ml-auto text-[10px] text-slate-500">Carbon Analytics</span>
        </div>

        {/* Eco Mode Toggle */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/40">
          <div>
            <div className="text-[11px] font-semibold text-slate-200">Eco Mode</div>
            <div className="text-[9px] text-slate-500">Prefer low-emission routes (+5% time)</div>
          </div>
          <button
            onClick={() => setEcoMode(v => !v)}
            className={`w-10 h-5 rounded-full transition-colors relative ${ecoMode ? "bg-emerald-500" : "bg-slate-600"}`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${ecoMode ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-emerald-400" />
          </div>
        ) : (
          <>
            {/* Eco Grade + Radial Chart */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-3">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                      <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#1e293b" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-sm font-black ${GRADE_COLOR[grade] ? "" : "text-emerald-400"}`} style={{ color: GRADE_COLOR[grade] }}>
                      {grade}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-slate-400 mb-1">Fleet Eco Grade</div>
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${GRADE_BG[grade]}`}>
                    <Leaf size={9} />
                    Grade {grade}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {savingsPct}% below baseline van fleet
                  </div>
                </div>
              </div>
            </div>

            {/* CO2 Stats */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                icon={<Zap size={12} className="text-orange-400" />}
                label="Total CO₂"
                value={`${co2Total.toFixed(2)} kg`}
                sub="this session"
                color="text-orange-400"
                bg="bg-orange-500/10 border-orange-500/20"
              />
              <StatCard
                icon={<TrendingDown size={12} className="text-emerald-400" />}
                label="CO₂ Saved"
                value={`${co2Saved.toFixed(2)} kg`}
                sub="vs. van baseline"
                color="text-emerald-400"
                bg="bg-emerald-500/10 border-emerald-500/20"
              />
            </div>

            {/* Trees equivalent */}
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/8 border border-emerald-500/20 rounded-lg">
              <span className="text-lg">🌳</span>
              <div>
                <div className="text-[11px] font-semibold text-emerald-400">{trees} trees/year</div>
                <div className="text-[9px] text-slate-500">equivalent CO₂ absorption</div>
              </div>
              {ecoMode && (
                <div className="ml-auto text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                  ECO ON
                </div>
              )}
            </div>

            {/* Active routes breakdown */}
            {live?.routes?.length > 0 && (
              <div>
                <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1.5">
                  Active Routes
                </div>
                <div className="space-y-1.5">
                  {live.routes.map((r) => (
                    <div key={r.route_id} className="flex items-center gap-2 px-2.5 py-2 bg-slate-800/50 rounded-lg border border-slate-700/30">
                      <div className={`w-1.5 h-5 rounded-full`} style={{ background: GRADE_COLOR[r.eco_grade] || "#10b981" }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-slate-200 truncate">{r.driver_name}</div>
                        <div className="text-[9px] text-slate-500">{r.vehicle_type} · {r.distance_km} km</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold" style={{ color: GRADE_COLOR[r.eco_grade] }}>
                          {r.eco_grade}
                        </div>
                        <div className="text-[9px] text-slate-500">{r.co2_kg} kg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Carbon cost */}
            {summary && (
              <div className="px-3 py-2 bg-slate-800/40 rounded-lg border border-slate-700/30 text-[11px] text-slate-400">
                Carbon cost: <span className="text-slate-200 font-semibold">₹{summary.carbon_cost_inr}</span>
                <span className="text-slate-600"> (India carbon market)</span>
              </div>
            )}

            <button
              onClick={load}
              className="w-full flex items-center justify-center gap-1.5 text-[11px] py-2 bg-slate-800 border border-slate-700/60 rounded-lg text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
            >
              <RefreshCw size={11} />
              Refresh
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color, bg }) {
  return (
    <div className={`rounded-lg border p-2.5 ${bg}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-slate-600 mt-0.5">{sub}</div>
    </div>
  );
}
