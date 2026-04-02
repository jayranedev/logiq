import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { driversApi } from "../services/api";
import useAppStore from "../stores/appStore";

export default function useDrivers() {
  const setDrivers = useAppStore((s) => s.setDrivers);

  const query = useQuery({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list(),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (query.data) setDrivers(query.data);
  }, [query.data]);

  return query;
}
