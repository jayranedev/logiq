import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Navigation, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../services/api";

const STEPS = [
  { status: "assigned",   label: "Assigned",   desc: "Order assigned to you" },
  { status: "picked_up",  label: "Picked Up",  desc: "Parcel collected from warehouse" },
  { status: "in_transit", label: "In Transit", desc: "On the way to customer" },
  { status: "delivered",  label: "Delivered",  desc: "Successfully delivered" },
];

const STATUS_ORDER = ["assigned", "picked_up", "in_transit", "delivered"];

const NEXT_ACTION = {
  assigned:   { label: "Mark Picked Up",  next: "picked_up",  color: "bg-purple-600 hover:bg-purple-500" },
  picked_up:  { label: "Start Delivery",  next: "in_transit", color: "bg-amber-600 hover:bg-amber-500" },
  in_transit: { label: "Mark Delivered",  next: "delivered",  color: "bg-emerald-600 hover:bg-emerald-500" },
};

export default function DriverStatus({ session }) {
  const { orderId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!order) {
      api.get(`/api/orders/${orderId}`).then(r => { setOrder(r.data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [orderId, order]);

  async function advanceStatus() {
    if (!order || !NEXT_ACTION[order.status]) return;
    setUpdating(true);
    setError(null);
    const nextStatus = NEXT_ACTION[order.status].next;
    try {
      const updated = await api.patch(`/api/orders/${order.id}`, { status: nextStatus }).then(r => r.data);
      setOrder(updated);
      setToast(`Status updated: ${nextStatus.replace(/_/g, " ")}`);
      setTimeout(() => setToast(null), 3000);
      if (nextStatus === "delivered") {
        setTimeout(() => navigate("/driver/orders"), 2000);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Update failed, try again");
    }
    setUpdating(false);
  }

  async function markFailed() {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await api.patch(`/api/orders/${order.id}`, { status: "failed" }).then(r => r.data);
      setOrder(updated);
      setToast("Order marked as failed");
      setTimeout(() => { setToast(null); navigate("/driver/orders"); }, 2000);
    } catch { setError("Update failed"); }
    setUpdating(false);
  }

  const stepIdx = STATUS_ORDER.indexOf(order?.status);
  const isDone = ["delivered", "failed"].includes(order?.status);
  const action = order ? NEXT_ACTION[order.status] : null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/driver/orders")} className="p-2 -ml-2 text-slate-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Order Details</p>
            {order && <p className="text-slate-500 text-xs font-mono">#{order.id}</p>}
          </div>
          {order?.status === "failed" && (
            <span className="text-xs text-red-400 bg-red-950 px-2.5 py-1 rounded-full font-semibold">Failed</span>
          )}
          {order?.status === "delivered" && (
            <span className="text-xs text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full font-semibold">Delivered</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !order ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <AlertCircle size={40} className="text-slate-700" />
          <p className="text-slate-400 text-sm">Order not found</p>
          <button onClick={() => navigate("/driver/orders")} className="text-blue-400 text-sm">← Back</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Customer card */}
          <div className="mx-4 mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-white font-bold">{order.customer_name}</p>
                <p className="text-slate-500 text-xs font-mono mt-0.5">#{order.id}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-300 text-xs font-semibold">{order.weight}kg</p>
                <p className={`text-xs mt-0.5 font-semibold capitalize ${
                  order.priority === "high" ? "text-red-400" :
                  order.priority === "medium" ? "text-blue-400" : "text-slate-500"
                }`}>{order.priority} priority</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-slate-400 text-xs">
              <MapPin size={12} className="mt-0.5 shrink-0 text-slate-600" />
              <span>{order.address}</span>
            </div>
            {order.customer_phone && (
              <a href={`tel:${order.customer_phone}`}
                className="flex items-center gap-2 mt-3 text-blue-400 text-xs font-semibold">
                <Phone size={12} /> {order.customer_phone}
              </a>
            )}
          </div>

          {/* Progress timeline */}
          {order.status !== "failed" && (
            <div className="mx-4 mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Progress</p>
              <div className="space-y-0">
                {STEPS.map((step, i) => {
                  const allDone = order.status === "delivered";
                  const isCompleted = allDone || i < stepIdx;
                  const isCurrent = !allDone && step.status === order.status;
                  return (
                    <div key={step.status} className="flex gap-3">
                      {/* Dot + line */}
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted ? "bg-emerald-600"
                            : isCurrent ? "bg-blue-600 ring-2 ring-blue-500/30"
                            : "bg-slate-800"
                        }`}>
                          {isCompleted
                            ? <CheckCircle2 size={13} className="text-white" />
                            : isCurrent
                            ? <div className="w-2 h-2 rounded-full bg-white" />
                            : <div className="w-2 h-2 rounded-full bg-slate-600" />}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`w-0.5 flex-1 my-1 ${isCompleted ? "bg-emerald-800" : "bg-slate-800"}`} style={{ minHeight: 20 }} />
                        )}
                      </div>
                      {/* Label */}
                      <div className="pb-4">
                        <p className={`text-sm font-semibold ${isCurrent ? "text-white" : isCompleted ? "text-slate-400" : "text-slate-600"}`}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Failed state */}
          {order.status === "failed" && (
            <div className="mx-4 mt-4 bg-red-950 border border-red-900 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle size={24} className="text-red-400 shrink-0" />
              <div>
                <p className="text-red-300 font-semibold text-sm">Delivery Failed</p>
                <p className="text-red-500 text-xs mt-0.5">This order has been marked as undeliverable</p>
              </div>
            </div>
          )}


          {/* Open in Maps */}
          {!isDone && order.delivery_lat && order.delivery_lng && (
            <div className="mx-4 mt-3">
              <a href={`https://maps.google.com/?q=${order.delivery_lat},${order.delivery_lng}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 border border-slate-700 text-slate-300 py-3 rounded-2xl text-sm font-semibold">
                <Navigation size={15} /> Navigate in Google Maps
              </a>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-4 mt-3 bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-auto px-4 pb-8 pt-4 space-y-3">
            {action && !isDone && (
              <button onClick={advanceStatus} disabled={updating}
                className={`w-full text-white font-bold py-4 rounded-2xl text-sm transition-colors disabled:opacity-50 ${action.color}`}>
                {updating ? "Updating…" : action.label}
              </button>
            )}
            {!isDone && order.status !== "assigned" && (
              <button onClick={markFailed} disabled={updating}
                className="w-full border border-red-900 text-red-500 py-3 rounded-2xl text-sm font-semibold">
                Mark as Failed
              </button>
            )}
            {isDone && (
              <button onClick={() => navigate("/driver/orders")}
                className="w-full bg-slate-800 text-slate-200 font-bold py-4 rounded-2xl text-sm">
                Back to Orders
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-2xl px-5 py-3.5 text-white text-sm font-semibold text-center shadow-2xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
