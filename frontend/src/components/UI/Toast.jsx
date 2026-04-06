import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, AlertTriangle, CheckCircle, X } from "lucide-react";
import useAppStore from "../../stores/appStore";

const ICONS = {
  success: { Icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  error: { Icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  warning: { Icon: AlertTriangle, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  info: { Icon: Wifi, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  offline: { Icon: WifiOff, color: "text-slate-400", bg: "bg-slate-800 border-slate-600/40" },
};

// Standalone toast store (separate from appStore for simplicity)
let _addToast = null;

export function toast(message, type = "info", duration = 4000) {
  if (_addToast) _addToast({ message, type, duration });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const wsConnected = useAppStore((s) => s.wsConnected);
  const prevConnected = useAppStore((s) => s._prevWsConnected);

  // Register global toast function
  useEffect(() => {
    _addToast = (t) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.duration);
    };
    return () => { _addToast = null; };
  }, []);

  // WS reconnect toast
  const [prevWs, setPrevWs] = useState(null);
  useEffect(() => {
    if (prevWs === null) { setPrevWs(wsConnected); return; }
    if (!wsConnected && prevWs) {
      toast("Connection lost — reconnecting…", "offline", 5000);
    } else if (wsConnected && !prevWs) {
      toast("Live connection restored", "success", 3000);
    }
    setPrevWs(wsConnected);
  }, [wsConnected]);

  // Delay alert toasts from event feed
  const events = useAppStore((s) => s.events);
  const [lastEventId, setLastEventId] = useState(null);
  useEffect(() => {
    if (!events.length) return;
    const latest = events[0];
    if (latest.id === lastEventId) return;
    setLastEventId(latest.id);
    if (latest.type === "delay_alert") {
      toast(
        latest.message || `Delay alert: Order #${latest.order_id}`,
        "warning",
        6000
      );
    } else if (latest.type === "order_delivered") {
      toast(`Delivered: ${latest.customer_name || `Order #${latest.order_id}`}`, "success", 3000);
    }
  }, [events]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const cfg = ICONS[t.type] || ICONS.info;
          const Icon = cfg.Icon;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border backdrop-blur-sm text-sm max-w-xs shadow-lg pointer-events-auto ${cfg.bg}`}
            >
              <Icon size={14} className={`${cfg.color} mt-0.5 shrink-0`} />
              <span className="text-slate-200 text-xs leading-relaxed flex-1">{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
