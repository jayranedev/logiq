import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { warehouseApi } from "../services/api";

const VEHICLE_TYPES = [
  { id: "bike",   label: "Bike",    icon: "bicycle",  cap: "15 kg" },
  { id: "scooter",label: "Scooter", icon: "walk",     cap: "20 kg" },
  { id: "van",    label: "Van",     icon: "car",      cap: "100 kg" },
  { id: "truck",  label: "Truck",   icon: "bus",      cap: "500 kg" },
];

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", pin: "", vehicle_type: "bike",
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleLogin() {
    if (!form.phone || !form.pin) {
      Alert.alert("Missing Info", "Enter your phone and PIN");
      return;
    }
    setLoading(true);
    try {
      const data = await warehouseApi.login(form.phone, form.pin);
      await AsyncStorage.setItem("driver_session", JSON.stringify(data));
      onLogin(data);
    } catch (e) {
      Alert.alert("Login Failed", e?.response?.data?.detail || "Invalid phone or PIN");
    }
    setLoading(false);
  }

  async function handleRegister() {
    if (!form.name || !form.phone) {
      Alert.alert("Missing Info", "Name and phone are required");
      return;
    }
    setLoading(true);
    try {
      const data = await warehouseApi.register({
        name: form.name,
        phone: form.phone,
        vehicle_type: form.vehicle_type,
      });
      Alert.alert(
        "Registration Success! 🎉",
        `Your PIN is: ${data.pin}\n\nWarehouse: ${data.home_warehouse}\n\nSave your PIN — you'll need it to log in.`,
        [{
          text: "Got it — Log In",
          onPress: () => {
            set("pin", data.pin);
            setMode("login");
          }
        }]
      );
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.detail || "Registration failed");
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl bg-blue-600 items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
              <Text className="text-white text-3xl font-black">L</Text>
            </View>
            <Text className="text-white text-3xl font-black tracking-widest">
              LOGIQ<Text className="text-blue-500">.AI</Text>
            </Text>
            <Text className="text-slate-500 text-sm mt-1">Driver Platform</Text>
          </View>

          {/* Mode toggle */}
          <View className="flex-row bg-slate-900 border border-slate-800 rounded-2xl p-1 mb-6">
            {["login", "register"].map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl items-center ${mode === m ? "bg-blue-600" : ""}`}
              >
                <Text className={`font-bold text-sm capitalize ${mode === m ? "text-white" : "text-slate-500"}`}>
                  {m === "login" ? "Log In" : "Sign Up"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View className="gap-3">
            {mode === "register" && (
              <Field
                label="Full Name"
                icon="person-outline"
                value={form.name}
                onChange={v => set("name", v)}
                placeholder="Your name"
              />
            )}

            <Field
              label="Phone Number"
              icon="phone-portrait-outline"
              value={form.phone}
              onChange={v => set("phone", v)}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
            />

            <Field
              label={mode === "login" ? "Your PIN" : "PIN will be generated"}
              icon="lock-closed-outline"
              value={form.pin}
              onChange={v => set("pin", v)}
              placeholder={mode === "login" ? "6-digit PIN" : "Auto-generated on signup"}
              keyboardType="number-pad"
              editable={mode === "login"}
              secureTextEntry
            />

            {/* Vehicle type (register only) */}
            {mode === "register" && (
              <View className="gap-2">
                <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                  Vehicle Type
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {VEHICLE_TYPES.map(v => (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => set("vehicle_type", v.id)}
                      className={`flex-row items-center gap-2 px-3 py-2.5 rounded-xl border flex-1 ${
                        form.vehicle_type === v.id
                          ? "bg-blue-600/20 border-blue-500/50"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <Ionicons
                        name={v.icon}
                        size={16}
                        color={form.vehicle_type === v.id ? "#3b82f6" : "#475569"}
                      />
                      <View>
                        <Text className={`text-xs font-bold ${form.vehicle_type === v.id ? "text-blue-400" : "text-slate-400"}`}>
                          {v.label}
                        </Text>
                        <Text className="text-slate-600 text-[10px]">{v.cap}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={mode === "login" ? handleLogin : handleRegister}
            disabled={loading}
            className="bg-blue-600 rounded-2xl py-4 items-center mt-6 shadow-lg shadow-blue-500/25"
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-bold text-base">
                  {mode === "login" ? "Log In" : "Create Account"}
                </Text>
            }
          </TouchableOpacity>

          {/* Info for register */}
          {mode === "register" && (
            <View className="mt-4 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl flex-row gap-3">
              <Ionicons name="information-circle-outline" size={18} color="#3b82f6" />
              <Text className="text-slate-400 text-xs leading-relaxed flex-1">
                You'll be automatically assigned to the nearest warehouse. Your 6-digit PIN will be shown after registration — save it!
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, icon, value, onChange, placeholder, keyboardType, secureTextEntry, editable = true }) {
  return (
    <View className="gap-1.5">
      <Text className="text-slate-500 text-xs font-semibold uppercase tracking-widest">{label}</Text>
      <View className={`flex-row items-center bg-slate-900 border rounded-xl px-3 gap-2.5 ${
        editable ? "border-slate-800" : "border-slate-800/40 opacity-50"
      }`}>
        <Ionicons name={icon} size={16} color="#475569" />
        <TextInput
          className="flex-1 py-3 text-white text-sm"
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#334155"
          keyboardType={keyboardType || "default"}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}
