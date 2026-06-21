// src/app/(app)/home.tsx
import React from "react";
import { View } from "react-native";
import { MapLayout } from "../../components/layout/MapLayout";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-black">
      <MapLayout />
    </View>
  );
}
