import { AnimatePresence, motion } from "framer-motion";
import useWebSocket from "./hooks/useWebSocket";
import useDrivers from "./hooks/useDrivers";
import useOrders from "./hooks/useOrders";
import useRoutes from "./hooks/useRoutes";
import useAppStore from "./stores/appStore";

import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import MapView from "./components/Map/MapView";
import FleetPanel from "./components/Fleet/FleetPanel";
import OrderQueue from "./components/Orders/OrderQueue";
import WarehousePanel from "./components/Warehouse/WarehousePanel";
import PredictionPanel from "./components/AI/PredictionPanel";
import RoutePanel from "./components/Route/RoutePanel";
import StatsPanel from "./components/Dashboard/StatsBar";
import EcoPanel from "./components/Eco/EcoPanel";
import AnalyticsPanel from "./components/Analytics/AnalyticsPanel";
import ToastContainer from "./components/UI/Toast";
import ErrorBoundary from "./components/UI/ErrorBoundary";

const PANELS = {
  fleet:     FleetPanel,
  orders:    OrderQueue,
  warehouse: WarehousePanel,
  ai:        PredictionPanel,
  routes:    RoutePanel,
  stats:     StatsPanel,
  eco:       EcoPanel,
  analytics: AnalyticsPanel,
};

const panelVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.15, ease: "easeOut" } },
  exit:    { opacity: 0, x: -6, transition: { duration: 0.1 } },
};

export default function App() {
  useWebSocket();
  useDrivers();
  useOrders();
  useRoutes();

  const activePanel = useAppStore(s => s.activePanel);
  const Panel = PANELS[activePanel] || FleetPanel;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Side panel */}
        <div className="w-[280px] shrink-0 border-r border-slate-800/80 overflow-hidden flex flex-col bg-slate-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col h-full"
            >
              <ErrorBoundary label={`${activePanel} panel`}>
                <Panel />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Map */}
        <ErrorBoundary label="Map">
          <MapView />
        </ErrorBoundary>
      </div>

      <ToastContainer />
    </div>
  );
}
