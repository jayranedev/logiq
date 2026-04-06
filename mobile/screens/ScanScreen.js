import { useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { getDriverId, parcelsApi } from "../services/api";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [route, setRoute] = useState(null);
  const cooldown = useRef(false);

  async function handleScan({ data }) {
    if (cooldown.current || loading) return;
    if (scanned.find(i => i.qr_code === data)) {
      setLastResult({ type: "dup", qr: data });
      return;
    }
    cooldown.current = true;
    Vibration.vibrate(60);
    setLoading(true);
    setScanning(false);
    try {
      const parcel = await parcelsApi.lookupByQr(data);
      await parcelsApi.confirmBagScan(data, getDriverId());
      setScanned(prev => [...prev, parcel]);
      setLastResult({ type: "ok", name: parcel.customer_name, zone: parcel.warehouse_zone });
    } catch (e) {
      setLastResult({
        type: "err",
        msg: e?.response?.status === 404 ? "Parcel not in system" : "Confirm failed",
      });
    }
    setLoading(false);
    setTimeout(() => { cooldown.current = false; setScanning(true); }, 2000);
  }

  async function startRoute() {
    if (!scanned.length) return;
    setRouteLoading(true);
    try {
      const r = await parcelsApi.assignRoute(getDriverId());
      setRoute(r);
    } catch {
      Alert.alert("Error", "Could not optimize route. Try again.");
    }
    setRouteLoading(false);
  }

  if (!permission) {
    return <View className="flex-1 bg-gray-950 items-center justify-center"><ActivityIndicator color="#3b82f6" /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950 items-center justify-center gap-4 px-8" edges={["top"]}>
        <View className="w-16 h-16 rounded-full bg-slate-800 items-center justify-center">
          <Ionicons name="camera-outline" size={32} color="#475569" />
        </View>
        <Text className="text-white text-lg font-bold text-center">Camera Access Needed</Text>
        <Text className="text-slate-500 text-sm text-center">LOGIQ needs camera access to scan parcel QR codes</Text>
        <TouchableOpacity onPress={requestPermission}
          className="bg-blue-600 rounded-xl px-8 py-3 mt-2">
          <Text className="text-white font-bold text-base">Allow Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (route) {
    return <RouteReadyScreen route={route} count={scanned.length} onReset={() => { setRoute(null); setScanned([]); setLastResult(null); }} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-slate-800">
        <View>
          <Text className="text-white text-xl font-bold">Scan Parcels</Text>
          <Text className="text-slate-500 text-xs mt-0.5">Scan each parcel to load into bag</Text>
        </View>
        <View className="ml-auto bg-blue-600/20 border border-blue-500/30 rounded-full px-3 py-1">
          <Text className="text-blue-400 text-xs font-bold">{scanned.length} loaded</Text>
        </View>
      </View>

      {/* Camera */}
      <View className="h-64 relative bg-black">
        {scanning ? (
          <CameraView
            className="flex-1"
            facing="back"
            onBarcodeScanned={handleScan}
            barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "ean13"] }}
          >
            <View className="flex-1 items-center justify-center">
              {/* Corner frame */}
              <View style={{ width: 180, height: 180, position: "relative" }}>
                {[["top-0 left-0", "border-t-2 border-l-2"],
                  ["top-0 right-0", "border-t-2 border-r-2"],
                  ["bottom-0 left-0", "border-b-2 border-l-2"],
                  ["bottom-0 right-0", "border-b-2 border-r-2"]].map(([pos, border], i) => (
                  <View key={i} className={`absolute w-6 h-6 border-blue-400 ${pos} ${border}`} />
                ))}
              </View>
              <Text className="text-white/60 text-xs mt-4 absolute bottom-4">
                Point at QR code on parcel label
              </Text>
            </View>
          </CameraView>
        ) : (
          <View className="flex-1 bg-gray-950 items-center justify-center gap-3">
            {loading ? (
              <>
                <ActivityIndicator color="#3b82f6" size="large" />
                <Text className="text-slate-400 text-sm">Checking parcel…</Text>
              </>
            ) : lastResult ? (
              <ScanFeedback result={lastResult} />
            ) : null}
          </View>
        )}
      </View>

      {/* Scanned list */}
      {scanned.length > 0 && (
        <View className="border-t border-slate-800 py-3">
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest px-5 mb-2">
            Loaded Parcels
          </Text>
          <FlatList
            data={scanned}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => (
              <View className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 flex-row items-center gap-2 max-w-36">
                <View className="w-5 h-5 rounded-full bg-emerald-500/20 items-center justify-center">
                  <Ionicons name="checkmark" size={11} color="#10b981" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-200 text-[11px] font-semibold" numberOfLines={1}>
                    {item.customer_name}
                  </Text>
                  <Text className="text-slate-500 text-[9px]">{item.warehouse_zone?.split(" ")[0]}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* Start Route button */}
      {scanned.length > 0 && (
        <View className="px-5 pb-4 pt-2">
          <TouchableOpacity
            onPress={startRoute}
            disabled={routeLoading}
            className="bg-blue-600 rounded-2xl py-4 flex-row items-center justify-center gap-3"
          >
            {routeLoading
              ? <ActivityIndicator color="#fff" />
              : <Ionicons name="navigate" size={20} color="#fff" />
            }
            <Text className="text-white text-base font-bold">
              {routeLoading ? "Optimizing…" : `Start Route — ${scanned.length} stops`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {scanned.length === 0 && !loading && (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Ionicons name="qr-code-outline" size={40} color="#1e293b" />
          <Text className="text-slate-600 text-sm text-center">
            Scan each parcel QR code as you load your bag
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function ScanFeedback({ result }) {
  if (result.type === "ok") return (
    <View className="items-center gap-2">
      <View className="w-14 h-14 rounded-full bg-emerald-500/20 items-center justify-center">
        <Ionicons name="checkmark-circle" size={36} color="#10b981" />
      </View>
      <Text className="text-emerald-400 text-lg font-bold">Loaded!</Text>
      <Text className="text-slate-400 text-sm">{result.name}</Text>
      <Text className="text-blue-400 text-xs">{result.zone}</Text>
    </View>
  );
  if (result.type === "dup") return (
    <View className="items-center gap-2">
      <View className="w-14 h-14 rounded-full bg-amber-500/20 items-center justify-center">
        <Ionicons name="alert-circle" size={36} color="#f59e0b" />
      </View>
      <Text className="text-amber-400 text-lg font-bold">Already Scanned</Text>
    </View>
  );
  return (
    <View className="items-center gap-2">
      <View className="w-14 h-14 rounded-full bg-red-500/20 items-center justify-center">
        <Ionicons name="close-circle" size={36} color="#ef4444" />
      </View>
      <Text className="text-red-400 text-lg font-bold">Not Found</Text>
      <Text className="text-slate-500 text-sm">{result.msg}</Text>
    </View>
  );
}

function RouteReadyScreen({ route, count, onReset }) {
  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={["top"]}>
      <View className="flex-1 items-center px-6 pt-12 gap-6">
        <View className="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-500/30 items-center justify-center">
          <Ionicons name="navigate-circle" size={48} color="#3b82f6" />
        </View>
        <View className="items-center gap-1">
          <Text className="text-white text-2xl font-black">Route Ready!</Text>
          <Text className="text-slate-500 text-sm">{count} stops optimized</Text>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 w-full">
          {[
            { label: "Stops", value: String(route.stops) },
            { label: "Distance", value: `${route.total_distance_km}km` },
            { label: "Est. Time", value: `${Math.round(route.estimated_time_min)}m` },
          ].map(s => (
            <View key={s.label} className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl py-4 items-center gap-1">
              <Text className="text-blue-400 text-xl font-black">{s.value}</Text>
              <Text className="text-slate-500 text-[11px]">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Waypoints */}
        <View className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 gap-3">
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Stop Order
          </Text>
          {(route.waypoints || []).slice(0, 5).map((wp, i) => (
            <View key={i} className="flex-row items-center gap-3">
              <View className="w-7 h-7 rounded-full bg-blue-600 items-center justify-center">
                <Text className="text-white text-xs font-bold">{i + 1}</Text>
              </View>
              <Text className="text-slate-300 text-sm flex-1" numberOfLines={1}>
                {wp.address || `Stop ${i + 1}`}
              </Text>
            </View>
          ))}
          {(route.waypoints?.length || 0) > 5 && (
            <Text className="text-slate-600 text-xs text-center">
              + {route.waypoints.length - 5} more stops
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onReset}
          className="border border-slate-700 rounded-xl px-8 py-3"
        >
          <Text className="text-slate-500 text-sm">Scan More Parcels</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
