import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ordersApi } from "../services/api";

const PRIORITY_DOT = { high: "bg-red-500", medium: "bg-blue-500", low: "bg-slate-500" };
const PRIORITY_TEXT = { high: "text-red-400", medium: "text-blue-400", low: "text-slate-500" };
const STATUS_BG = {
  pending:    "bg-slate-800",
  assigned:   "bg-blue-950",
  picked_up:  "bg-purple-950",
  in_transit: "bg-amber-950",
  delivered:  "bg-emerald-950",
  failed:     "bg-red-950",
};
const STATUS_TEXT = {
  pending:    "text-slate-400",
  assigned:   "text-blue-400",
  picked_up:  "text-purple-400",
  in_transit: "text-amber-400",
  delivered:  "text-emerald-400",
  failed:     "text-red-400",
};

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await ordersApi.myOrders();
      setOrders(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const active = orders.filter(o => !["delivered","failed"].includes(o.status));
  const done   = orders.filter(o =>  ["delivered","failed"].includes(o.status));

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text className="text-slate-500 text-sm mt-3">Loading your orders…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-slate-800/60">
        <View>
          <Text className="text-white text-xl font-bold">My Deliveries</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{active.length} active · {done.length} completed</Text>
        </View>
        <View className="ml-auto bg-blue-600/20 border border-blue-500/30 rounded-full px-3 py-1">
          <Text className="text-blue-400 text-xs font-bold">{orders.length} total</Text>
        </View>
      </View>

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3">
          <View className="w-16 h-16 rounded-full bg-slate-800 items-center justify-center">
            <Ionicons name="cube-outline" size={32} color="#334155" />
          </View>
          <Text className="text-slate-500 text-base font-semibold">No orders assigned</Text>
          <Text className="text-slate-600 text-sm">Pull down to refresh</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item }) => <OrderCard item={item} navigation={navigation} />}
        />
      )}
    </SafeAreaView>
  );
}

function OrderCard({ item, navigation }) {
  const isActionable = !["delivered", "failed"].includes(item.status);
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("Status", { order: item })}
      activeOpacity={0.8}
      className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden"
    >
      {/* Top accent strip */}
      <View className={`h-0.5 ${item.priority === "high" ? "bg-red-500" : item.priority === "medium" ? "bg-blue-500" : "bg-slate-600"}`} />

      <View className="p-4">
        {/* Row 1: ID + status */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <View className={`w-2 h-2 rounded-full ${PRIORITY_DOT[item.priority] || "bg-slate-500"}`} />
            <Text className="text-slate-500 text-xs font-mono">#{item.id}</Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full ${STATUS_BG[item.status] || "bg-slate-800"}`}>
            <Text className={`text-[11px] font-semibold capitalize ${STATUS_TEXT[item.status] || "text-slate-400"}`}>
              {item.status?.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        {/* Customer name */}
        <Text className="text-white text-base font-semibold mb-1">{item.customer_name}</Text>

        {/* Address */}
        <View className="flex-row items-center gap-1.5 mb-3">
          <Ionicons name="location-outline" size={13} color="#475569" />
          <Text className="text-slate-500 text-xs flex-1" numberOfLines={1}>
            {item.address || "Mumbai"}
          </Text>
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between pt-3 border-t border-slate-800">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="scale-outline" size={12} color="#475569" />
              <Text className="text-slate-500 text-xs">{item.weight}kg</Text>
            </View>
            {item.warehouse_zone && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="grid-outline" size={12} color="#475569" />
                <Text className="text-slate-500 text-xs">{item.warehouse_zone}</Text>
              </View>
            )}
          </View>
          {isActionable && (
            <View className="flex-row items-center gap-1">
              <Text className="text-blue-400 text-xs font-semibold">Update</Text>
              <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
