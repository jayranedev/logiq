import { BarChart2, Map, Package, Truck, Zap } from "lucide-react";
import clsx from "clsx";
import useAppStore from "../../stores/appStore";

const NAV = [
  { id: "fleet", icon: Truck, label: "Fleet" },
  { id: "orders", icon: Package, label: "Orders" },
  { id: "ai", icon: Zap, label: "AI" },
  { id: "routes", icon: Map, label: "Routes" },
  { id: "stats", icon: BarChart2, label: "Stats" },
];

export default function Sidebar() {
  const { activePanel, setActivePanel } = useAppStore();

  return (
    <nav className="w-14 bg-slate-900 border-r border-slate-700/60 flex flex-col items-center py-3 gap-1 shrink-0">
      {NAV.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setActivePanel(id)}
          title={label}
          className={clsx(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            activePanel === id
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          <Icon size={18} />
        </button>
      ))}
    </nav>
  );
}
