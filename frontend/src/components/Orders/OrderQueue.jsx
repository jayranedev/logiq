import { useState } from "react";
import { Package, Filter, ArrowUpDown } from "lucide-react";
import clsx from "clsx";
import useAppStore from "../../stores/appStore";
import OrderRow from "./OrderRow";

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "assigned", label: "Assigned" },
  { id: "in_transit", label: "In Transit" },
  { id: "delivered", label: "Delivered" },
];

export default function OrderQueue() {
  const { orders, orderFilter, setOrderFilter } = useAppStore();
  const [sortBy, setSortBy] = useState("newest");

  const filtered =
    orderFilter === "all"
      ? orders
      : orders.filter((o) => o.status === orderFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "priority") {
      const p = { high: 3, medium: 2, low: 1 };
      return (p[b.priority] || 0) - (p[a.priority] || 0);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    assigned: orders.filter((o) => o.status === "assigned").length,
    in_transit: orders.filter((o) => o.status === "in_transit").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Package size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-100">Orders</span>
          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} shown
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setOrderFilter(tab.id)}
              className={clsx(
                "text-[10px] px-2 py-1 rounded-full border transition-colors",
                orderFilter === tab.id
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                  : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:border-slate-600"
              )}
            >
              {tab.label}
              <span className="ml-1 text-slate-500">{statusCounts[tab.id]}</span>
            </button>
          ))}
        </div>

        {/* Sort toggle */}
        <button
          onClick={() =>
            setSortBy((s) => (s === "newest" ? "priority" : "newest"))
          }
          className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowUpDown size={10} />
          Sort: {sortBy === "newest" ? "Newest first" : "Priority"}
        </button>
      </div>

      {/* Order list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center text-slate-600 text-sm py-8">
            No orders match filter
          </div>
        ) : (
          sorted.map((o) => <OrderRow key={o.id} order={o} />)
        )}
      </div>
    </div>
  );
}
