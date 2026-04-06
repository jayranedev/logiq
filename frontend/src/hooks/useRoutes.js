import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { routesApi } from "../services/api";
import useAppStore from "../stores/appStore";

export default function useRoutes() {
  const setRoutes = useAppStore(s => s.setRoutes);
  const events    = useAppStore(s => s.events);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["routes"],
    queryFn: () => routesApi.list(),
    refetchInterval: 8000,
  });

  // Immediately refetch when a route_optimized event arrives via WebSocket
  useEffect(() => {
    const latest = events[0];
    if (latest?.type === "route_optimized") {
      qc.invalidateQueries({ queryKey: ["routes"] });
    }
  }, [events, qc]);

  useEffect(() => {
    if (query.data) setRoutes(query.data);
  }, [query.data]);

  return query;
}
