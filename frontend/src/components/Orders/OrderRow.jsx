import clsx from "clsx";
import { ORDER_STATUS_BG, PRIORITY_COLORS } from "../../utils/constants";
import { formatTime } from "../../utils/helpers";

export default function OrderRow({ order }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-200 truncate">#{order.id} {order.customer_name}</div>
        <div className="text-slate-500 truncate">{order.address || "Mumbai"}</div>
      </div>
      <span className={clsx("px-1.5 py-0.5 rounded capitalize", ORDER_STATUS_BG[order.status])}>
        {order.status}
      </span>
      <span className={clsx("font-semibold capitalize", PRIORITY_COLORS[order.priority])}>
        {order.priority}
      </span>
    </div>
  );
}
