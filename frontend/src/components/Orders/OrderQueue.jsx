import { Package } from "lucide-react";
import useAppStore from "../../stores/appStore";
import OrderRow from "./OrderRow";

export default function OrderQueue() {
  const orders = useAppStore((s) => s.orders);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2">
          <Package size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-100">Orders</span>
          <span className="ml-auto text-xs text-slate-500">{orders.length} total</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {orders.map((o) => <OrderRow key={o.id} order={o} />)}
      </div>
    </div>
  );
}
