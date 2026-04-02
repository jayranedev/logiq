import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ordersApi } from "../services/api";
import useAppStore from "../stores/appStore";

export default function useOrders() {
  const setOrders = useAppStore((s) => s.setOrders);

  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (query.data) setOrders(query.data);
  }, [query.data]);

  return query;
}
