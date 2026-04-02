import { useEffect, useRef, useCallback } from "react";
import useAppStore from "../stores/appStore";
import { WS_URL } from "../utils/constants";

const RECONNECT_DELAY = 3000;

export default function useWebSocket() {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(false);
  const { updateDriverPosition, updateDriverStatus, pushEvent, setWsConnected } =
    useAppStore();

  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING) return;

    const socket = new WebSocket(WS_URL);
    ws.current = socket;

    socket.onopen = () => {
      if (!isMounted.current) { socket.close(); return; }
      setWsConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    socket.onmessage = (e) => {
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

    socket.onclose = () => {
      setWsConnected(false);
      // Only reconnect if still mounted
      if (isMounted.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    socket.onerror = () => {
      // Silently close — onclose handler will reconnect
      socket.close();
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
      if (ws.current) {
        ws.current.onclose = null; // prevent reconnect on cleanup
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect]);
}
