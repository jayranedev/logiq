import "./global.css";
import { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen  from "./screens/LoginScreen";
import OrdersScreen from "./screens/OrdersScreen";
import MapScreen    from "./screens/MapScreen";
import StatusScreen from "./screens/StatusScreen";
import ScanScreen   from "./screens/ScanScreen";
import { startGpsTracking, stopGpsTracking } from "./services/gpsTracker";
import { setDriverId } from "./services/api";

const Tab = createBottomTabNavigator();

const NAV_THEME = {
  dark: true,
  colors: {
    primary: "#3b82f6",
    background: "#030712",
    card: "#0f172a",
    text: "#f8fafc",
    border: "#1e293b",
    notification: "#ef4444",
  },
};

export default function App() {
  const [session, setSession]       = useState(null);   // driver session object
  const [checkingAuth, setCheckingAuth] = useState(true); // loading auth state
  const [gpsReady, setGpsReady]     = useState(false);

  // Check for persisted session on mount
  useEffect(() => {
    AsyncStorage.getItem("driver_session").then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          setSession(saved);
          setDriverId(saved.driver_id);
        } catch {}
      }
      setCheckingAuth(false);
    });
  }, []);

  // Start GPS once we have a session
  useEffect(() => {
    if (!session) return;
    setDriverId(session.driver_id);
    startGpsTracking(session.driver_id).then(() => setGpsReady(true));
    return () => stopGpsTracking();
  }, [session]);

  function handleLogin(driverData) {
    setSession(driverData);
  }

  async function handleLogout() {
    await AsyncStorage.removeItem("driver_session");
    stopGpsTracking();
    setSession(null);
    setGpsReady(false);
  }

  // Checking persisted auth
  if (checkingAuth) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  // Not logged in → show login screen
  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <LoginScreen onLogin={handleLogin} />
      </SafeAreaProvider>
    );
  }

  // Logged in but GPS not ready yet
  if (!gpsReady) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center gap-4">
        <View className="w-16 h-16 rounded-2xl bg-blue-600 items-center justify-center">
          <Text className="text-white text-2xl font-black">L</Text>
        </View>
        <Text className="text-white text-2xl font-black tracking-widest">
          LOGIQ<Text className="text-blue-500">.AI</Text>
        </Text>
        <Text className="text-slate-500 text-sm">
          Welcome back, {session.name}
        </Text>
        <ActivityIndicator color="#3b82f6" className="mt-2" />
        <Text className="text-slate-600 text-xs">Starting GPS…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={NAV_THEME}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#0f172a",
              borderTopColor: "#1e293b",
              borderTopWidth: 1,
              height: 64,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: "#3b82f6",
            tabBarInactiveTintColor: "#475569",
            tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
            tabBarIcon: ({ focused, color }) => {
              const icons = {
                Orders: focused ? "list"              : "list-outline",
                Scan:   focused ? "qr-code"           : "qr-code-outline",
                Map:    focused ? "map"               : "map-outline",
                Status: focused ? "checkmark-circle"  : "checkmark-circle-outline",
              };
              return <Ionicons name={icons[route.name]} size={22} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Orders" component={OrdersScreen} />
          <Tab.Screen name="Scan"   component={ScanScreen} />
          <Tab.Screen name="Map"    component={MapScreen} />
          <Tab.Screen
            name="Status"
            component={StatusScreen}
            initialParams={{ onLogout: handleLogout, driverName: session.name }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
