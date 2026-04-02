import { Map } from "lucide-react";

// Phase 2: route optimization panel
export default function RoutePanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Map size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-100">Routes</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
        Available in Phase 2
      </div>
    </div>
  );
}
