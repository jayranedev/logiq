import { useState } from "react";
import {
  View, Text, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ordersApi } from "../services/api";

const STATUS_FLOW = [
  {
    from: ["assigned"],
    to: "picked_up",
    label: "Mark Picked Up",
    desc: "Confirm you've collected the parcel",
    icon: "cube",
    color: "#a855f7",
    bg: "bg-purple-950",
    border: "border-purple-800",
    text: "text-purple-400",
  },
  {
    from: ["picked_up"],
    to: "in_transit",
    label: "Start Delivery",
    desc: "You're on the way to the customer",
    icon: "bicycle",
    color: "#f59e0b",
    bg: "bg-amber-950",
    border: "border-amber-800",
    text: "text-amber-400",
  },
  {
    from: ["in_transit", "assigned", "picked_up"],
    to: "delivered",
    label: "Mark Delivered",
    desc: "Parcel handed to customer successfully",
    icon: "checkmark-circle",
    color: "#10b981",
    bg: "bg-emerald-950",
    border: "border-emerald-800",
    text: "text-emerald-400",
  },
  {
    from: ["assigned", "picked_up", "in_transit"],
    to: "failed",
    label: "Report Failed",
    desc: "Customer unavailable or wrong address",
    icon: "close-circle",
    color: "#ef4444",
    bg: "bg-red-950",
    border: "border-red-900",
    text: "text-red-400",
  },
];

const STATUS_STEP = ["assigned", "picked_up", "in_transit", "delivered"];

export default function StatusScreen({ route, navigation }) {
  const order = route?.params?.order;
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(order?.status || "assigned");

  const actions = STATUS_FLOW.filter(s => s.from.includes(currentStatus));
  const stepIdx = STATUS_STEP.indexOf(currentStatus);
  const isDone = ["delivered", "failed"].includes(currentStatus);

  async function handleUpdate(newStatus) {
    if (!order) return;
    setLoading(true);
    try {
      await ordersApi.updateStatus(order.id, newStatus);
      setCurrentStatus(newStatus);
      Alert.alert(
        "Status Updated",
        `Order #${order.id} is now: ${newStatus.replace(/_/g, " ")}`,
        [{ text: "OK", onPress: () => navigation.navigate("Orders") }]
      );
    } catch {
      Alert.alert("Error", "Failed to update. Please try again.");
    }
    setLoading(false);
  }

  if (!order) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={["top"]}>
        <View className="px-5 py-4 border-b border-slate-800">
          <Text className="text-white text-xl font-bold">Order Status</Text>
        </View>
        <View className="flex-1 items-center justify-center gap-3">
          <Ionicons name="list-outline" size={40} color="#334155" />
          <Text className="text-slate-500 text-base">Select an order from the list</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 py-4 border-b border-slate-800">
        <TouchableOpacity onPress={() => navigation.goBack()}
          className="w-8 h-8 rounded-full bg-slate-800 items-center justify-center">
          <Ionicons name="arrow-back" size={18} color="#94a3b8" />
        </TouchableOpacity>
        <View>
          <Text className="text-white text-lg font-bold">Order #{order.id}</Text>
          <Text className="text-slate-500 text-xs capitalize">{currentStatus.replace(/_/g, " ")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* Customer card */}
        <View className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <Text className="text-white text-lg font-bold mb-3">{order.customer_name}</Text>
          <View className="gap-2">
            <Row icon="location-outline" text={order.address || "Mumbai Delivery"} />
            <Row icon="scale-outline" text={`${order.weight} kg · ${order.priority} priority`} />
            <Row icon="phone-portrait-outline" text={order.customer_phone} />
            {order.warehouse_zone && (
              <Row icon="grid-outline" text={`Zone: ${order.warehouse_zone}`} />
            )}
          </View>
        </View>

        {/* Progress steps */}
        <View className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
            Delivery Progress
          </Text>
          <View className="flex-row items-center">
            {STATUS_STEP.map((step, i) => (
              <View key={step} className="flex-row items-center flex-1">
                <View className={`w-7 h-7 rounded-full items-center justify-center ${
                  i <= stepIdx ? "bg-blue-600" : "bg-slate-800"
                }`}>
                  {i < stepIdx ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : (
                    <Text className={`text-[10px] font-bold ${i === stepIdx ? "text-white" : "text-slate-600"}`}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                {i < STATUS_STEP.length - 1 && (
                  <View className={`flex-1 h-0.5 ${i < stepIdx ? "bg-blue-600" : "bg-slate-800"}`} />
                )}
              </View>
            ))}
          </View>
          <View className="flex-row justify-between mt-2">
            {STATUS_STEP.map((step, i) => (
              <Text key={step} className={`text-[9px] font-medium capitalize ${
                i <= stepIdx ? "text-blue-400" : "text-slate-600"
              }`} style={{ flex: 1, textAlign: i === 0 ? "left" : i === STATUS_STEP.length - 1 ? "right" : "center" }}>
                {step.replace(/_/g, "\n")}
              </Text>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        {isDone ? (
          <View className="bg-slate-900 rounded-2xl border border-slate-800 items-center py-10 gap-3">
            <Ionicons
              name={currentStatus === "delivered" ? "checkmark-circle" : "close-circle"}
              size={48}
              color={currentStatus === "delivered" ? "#10b981" : "#ef4444"}
            />
            <Text className={`text-lg font-bold ${currentStatus === "delivered" ? "text-emerald-400" : "text-red-400"}`}>
              {currentStatus === "delivered" ? "Delivered!" : "Delivery Failed"}
            </Text>
            <Text className="text-slate-500 text-sm">This order is complete</Text>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              Update Status
            </Text>
            {actions.map(action => (
              <TouchableOpacity
                key={action.to}
                onPress={() => handleUpdate(action.to)}
                disabled={loading}
                activeOpacity={0.8}
                className={`flex-row items-center gap-4 p-4 rounded-2xl border ${action.bg} ${action.border}`}
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: action.color + "25" }}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <View className="flex-1">
                  <Text className={`font-bold text-base ${action.text}`}>{action.label}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">{action.desc}</Text>
                </View>
                {loading
                  ? <ActivityIndicator color={action.color} size="small" />
                  : <Ionicons name="chevron-forward" size={18} color={action.color + "80"} />
                }
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, text }) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={14} color="#475569" />
      <Text className="text-slate-400 text-sm flex-1" numberOfLines={1}>{text}</Text>
    </View>
  );
}
