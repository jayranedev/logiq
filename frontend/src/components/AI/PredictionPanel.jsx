import { useState, useEffect } from "react";
import { Zap, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import clsx from "clsx";
import useAppStore from "../../stores/appStore";
import { predictionsApi } from "../../services/api";
import RiskCard from "./RiskCard";
import FactorChart from "./FactorChart";

export default function PredictionPanel() {
  const { orders, predictions, addPrediction } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Auto-fetch predictions for first 10 orders
  useEffect(() => {
    if (orders.length > 0 && Object.keys(predictions).length === 0) {
      fetchBatchPredictions();
    }
  }, [orders]);

  async function fetchBatchPredictions() {
    setLoading(true);
    try {
      const orderIds = orders.slice(0, 20).map((o) => o.id);
      const result = await predictionsApi.batch({ order_ids: orderIds });
      result.predictions.forEach((p) => {
        addPrediction(p.order_id, p);
      });
    } catch (err) {
      console.error("Failed to fetch predictions:", err);
    }
    setLoading(false);
  }

  const predList = Object.entries(predictions)
    .map(([orderId, pred]) => ({ ...pred, order_id: Number(orderId) }))
    .sort((a, b) => b.delay_probability - a.delay_probability);

  const highRisk = predList.filter((p) => p.risk_level === "HIGH").length;
  const medRisk = predList.filter((p) => p.risk_level === "MEDIUM").length;
  const lowRisk = predList.filter((p) => p.risk_level === "LOW").length;

  const selected = selectedOrderId ? predictions[selectedOrderId] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={15} className="text-amber-400" />
          <span className="text-sm font-semibold text-slate-100">
            AI Predictions
          </span>
          {loading && <Loader2 size={13} className="animate-spin text-blue-400 ml-auto" />}
        </div>

        {/* Risk summary */}
        <div className="flex gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-red-400">
            <AlertTriangle size={10} /> {highRisk} high
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1 text-amber-400">
            <Clock size={10} /> {medRisk} medium
          </span>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle size={10} /> {lowRisk} low
          </span>
        </div>

        <button
          onClick={fetchBatchPredictions}
          disabled={loading}
          className="mt-2 w-full text-[11px] px-3 py-1.5 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-600/30 transition-colors disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Refresh Predictions"}
        </button>
      </div>

      {/* Selected prediction detail */}
      {selected && (
        <div className="px-3 py-2 border-b border-slate-700/40 bg-slate-800/40">
          <div className="text-xs text-slate-400 mb-1">
            Order #{selectedOrderId}
          </div>
          <FactorChart factors={selected.factors || []} />
        </div>
      )}

      {/* Prediction list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {predList.length === 0 ? (
          <div className="text-center text-slate-600 text-sm py-8">
            {loading ? "Loading predictions..." : "Click Refresh to analyze orders"}
          </div>
        ) : (
          predList.map((p) => (
            <RiskCard
              key={p.order_id}
              prediction={p}
              isSelected={selectedOrderId === p.order_id}
              onSelect={() =>
                setSelectedOrderId(
                  selectedOrderId === p.order_id ? null : p.order_id
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
