import { Activity, BarChart2, Leaf, Map, Package, QrCode, Truck, Zap } from "lucide-react";
import useAppStore from "../../stores/appStore";

const NAV = [
  { id: "fleet",     icon: Truck,     label: "Fleet" },
  { id: "orders",    icon: Package,   label: "Orders" },
  { id: "warehouse", icon: QrCode,    label: "Warehouse" },
  { id: "ai",        icon: Zap,       label: "AI" },
  { id: "routes",    icon: Map,       label: "Routes" },
  { id: "eco",       icon: Leaf,      label: "Eco" },
  { id: "analytics", icon: Activity,  label: "Analytics" },
  { id: "stats",     icon: BarChart2, label: "Stats" },
];

export default function Sidebar() {
  const { activePanel, setActivePanel } = useAppStore();

  return (
    <nav className="w-[72px] shrink-0 bg-slate-950 border-r border-slate-800/80 flex flex-col items-center py-3 gap-0.5">
      {NAV.map(({ id, icon: Icon, label }) => {
        const active = activePanel === id;
        return (
          <button
            key={id}
            onClick={() => setActivePanel(id)}
            title={label}
            className={`relative w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-150 group ${
              active
                ? "bg-blue-600/15 text-blue-400"
                : "text-slate-600 hover:text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            {/* Active left bar */}
            {active && (
              <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-blue-500" />
            )}
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
            <span className={`text-[9px] font-semibold leading-none ${active ? "text-blue-400" : "text-slate-600 group-hover:text-slate-400"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
