import { useEffect, useRef } from "react";
import useAppStore from "../stores/appStore";
import { WS_URL } from "../utils/constants";

const RECONNECT_DELAY = 3000;

export default function useWebSocket() {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const { updateDriverPosition, updateDriverStatus, pushEvent, setWsConnected } = useAppStore();

  function connect() {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      setWsConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "location") {
          updateDriverPosition(msg.driver_id, msg.lat, msg.lng, {
            name: msg.name,
          });
          if (msg.status) updateDriverStatus(msg.driver_id, msg.status);
        } else if (msg.type !== "ping") {
          pushEvent(msg);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.current.onclose = () => {
      setWsConnected(false);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.current.onerror = () => {
      ws.current?.close();
    };
  }

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, []);
}
