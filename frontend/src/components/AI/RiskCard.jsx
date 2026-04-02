import clsx from "clsx";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

const RISK_CONFIG = {
  HIGH: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
  MEDIUM: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
  LOW: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
};

export default function RiskCard({ prediction, isSelected, onSelect }) {
  const config = RISK_CONFIG[prediction.risk_level] || RISK_CONFIG.LOW;
  const Icon = config.icon;

  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full text-left rounded-lg border p-3 transition-all",
        isSelected
          ? "bg-blue-600/15 border-blue-500/50"
          : `${config.bg} hover:brightness-110`
      )}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className={config.color} />
        <span className="text-xs font-semibold text-slate-200">
          Order #{prediction.order_id}
        </span>
        <span
          className={clsx(
            "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full",
            prediction.risk_level === "HIGH"
              ? "bg-red-500/20 text-red-400"
              : prediction.risk_level === "MEDIUM"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-emerald-500/20 text-emerald-400"
          )}
        >
          {prediction.risk_level}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-2 text-[10px]">
        <div>
          <span className="text-slate-500">Delay Risk:</span>{" "}
          <span className={config.color}>
            {Math.round(prediction.delay_probability * 100)}%
          </span>
        </div>
        <div>
          <span className="text-slate-500">Est Delay:</span>{" "}
          <span className="text-slate-300">
            {prediction.estimated_delay_minutes} min
          </span>
        </div>
      </div>

      {/* Mini delay bar */}
      <div className="mt-2 h-1 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all",
            prediction.risk_level === "HIGH"
              ? "bg-red-500"
              : prediction.risk_level === "MEDIUM"
                ? "bg-amber-500"
                : "bg-emerald-500"
          )}
          style={{ width: `${Math.min(100, prediction.delay_probability * 100)}%` }}
        />
      </div>
    </button>
  );
}
