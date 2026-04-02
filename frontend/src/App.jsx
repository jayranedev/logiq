import useWebSocket from "./hooks/useWebSocket";
import useDrivers from "./hooks/useDrivers";
import useOrders from "./hooks/useOrders";
import useAppStore from "./stores/appStore";

import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import MapView from "./components/Map/MapView";
import FleetPanel from "./components/Fleet/FleetPanel";
import OrderQueue from "./components/Orders/OrderQueue";
import PredictionPanel from "./components/AI/PredictionPanel";
import RoutePanel from "./components/Route/RoutePanel";
import StatsPanel from "./components/Dashboard/StatsBar";
import LiveFeed from "./components/Dashboard/LiveFeed";

const PANELS = {
  fleet: FleetPanel,
  orders: OrderQueue,
  ai: PredictionPanel,
  routes: RoutePanel,
  stats: StatsPanel,
};

export default function App() {
  // Bootstrap data + real-time
  useWebSocket();
  useDrivers();
  useOrders();

  const activePanel = useAppStore((s) => s.activePanel);
  const Panel = PANELS[activePanel] || FleetPanel;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Side panel */}
        <div className="w-72 shrink-0 bg-slate-900 border-r border-slate-700/60 overflow-hidden flex flex-col">
          <Panel />
        </div>

        {/* Map */}
        <MapView />
      </div>
    </div>
  );
}
