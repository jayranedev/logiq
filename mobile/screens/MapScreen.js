import { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { ordersApi } from "../services/api";

const MUMBAI = { latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.08, longitudeDelta: 0.08 };

export default function MapScreen() {
  const mapRef = useRef(null);
  const [myLocation, setMyLocation] = useState(null);
  const [orders, setOrders] = useState([]);
  const [centered, setCentered] = useState(true);

  useEffect(() => {
    let sub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        loc => setMyLocation(loc.coords)
      );
    })();
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await ordersApi.myOrders();
        setOrders(data.filter(o => ["assigned", "picked_up", "in_transit"].includes(o.status)));
      } catch {}
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  function centerOnMe() {
    if (!myLocation || !mapRef.current) return;
    mapRef.current.animateToRegion({
      latitude: myLocation.latitude,
      longitude: myLocation.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
    setCentered(true);
  }

  const routeCoords = myLocation
    ? [
        { latitude: myLocation.latitude, longitude: myLocation.longitude },
        ...orders.map(o => ({ latitude: o.delivery_lat, longitude: o.delivery_lng })),
      ]
    : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-slate-800">
        <View>
          <Text className="text-white text-xl font-bold">Live Map</Text>
          <Text className="text-slate-500 text-xs mt-0.5">{orders.length} stops ahead</Text>
        </View>
        {myLocation && (
          <View className="ml-auto bg-emerald-950 border border-emerald-800 rounded-full px-3 py-1 flex-row items-center gap-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <Text className="text-emerald-400 text-[11px] font-semibold">GPS Active</Text>
          </View>
        )}
      </View>

      {/* Map */}
      <View className="flex-1 relative">
        <MapView
          ref={mapRef}
          className="flex-1"
          initialRegion={MUMBAI}
          userInterfaceStyle="dark"
          showsUserLocation={false}
          showsTraffic={false}
          onPanDrag={() => setCentered(false)}
        >
          {myLocation && (
            <Marker
              coordinate={{ latitude: myLocation.latitude, longitude: myLocation.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20,
                backgroundColor: "#3b82f615", borderWidth: 2, borderColor: "#3b82f6",
                alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#3b82f6" }} />
              </View>
            </Marker>
          )}

          {orders.map((o, i) => (
            <Marker
              key={o.id}
              coordinate={{ latitude: o.delivery_lat, longitude: o.delivery_lng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={{ width: 30, height: 30, borderRadius: 15,
                backgroundColor: "#0f172a", borderWidth: 2, borderColor: "#f59e0b",
                alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#f59e0b", fontSize: 12, fontWeight: "700" }}>{i + 1}</Text>
              </View>
            </Marker>
          ))}

          {routeCoords.length >= 2 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#3b82f6"
              strokeWidth={3}
              lineDashPattern={[10, 5]}
            />
          )}
        </MapView>

        {/* Controls */}
        <View className="absolute bottom-5 right-4 gap-3">
          <TouchableOpacity
            onPress={centerOnMe}
            className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${
              centered ? "bg-blue-600" : "bg-slate-800 border border-slate-700"
            }`}
          >
            <Ionicons name="locate" size={22} color={centered ? "#fff" : "#94a3b8"} />
          </TouchableOpacity>
        </View>

        {/* GPS coords pill */}
        {myLocation && (
          <View className="absolute bottom-6 left-4 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <Text className="text-slate-500 text-[10px] font-mono">
              {myLocation.latitude.toFixed(5)}, {myLocation.longitude.toFixed(5)}
            </Text>
          </View>
        )}

        {/* Stop list overlay */}
        {orders.length > 0 && (
          <View className="absolute top-3 left-3 right-3">
            <View className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 gap-1.5">
              <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                Route Stops
              </Text>
              {orders.slice(0, 3).map((o, i) => (
                <View key={o.id} className="flex-row items-center gap-2">
                  <View className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 items-center justify-center">
                    <Text className="text-amber-400 text-[10px] font-bold">{i + 1}</Text>
                  </View>
                  <Text className="text-slate-300 text-xs flex-1" numberOfLines={1}>
                    {o.address || o.customer_name}
                  </Text>
                </View>
              ))}
              {orders.length > 3 && (
                <Text className="text-slate-600 text-[10px] text-center">+ {orders.length - 3} more</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
