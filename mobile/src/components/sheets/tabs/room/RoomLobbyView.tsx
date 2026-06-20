import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import {
  LogIn,
  Plus,
  XCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Shield,
} from "lucide-react-native";
import { useRoomStore } from "@/store/room.store";
import { normalizeRoomCode } from "@/utils/room.utils";
import { JoinCodeBoxes } from "./JoinCodeBoxes";

export function RoomLobbyView() {
  const { createRoom, joinRoom, actionLoading, error } = useRoomStore();

  const [createRoomName, setCreateRoomName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const inputRef = useRef<any>(null);

  // Placeholder states for room configurations
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [maxMembers, setMaxMembers] = useState("No limit");
  const [expiry, setExpiry] = useState("Never");
  const [isPrivate, setIsPrivate] = useState(false);

  const isBusy = actionLoading;

  const handleCreateRoom = async () => {
    if (!createRoomName.trim()) return;
    try {
      await createRoom(createRoomName);
      setCreateRoomName("");
    } catch {
      // Store exposes friendly error text
    }
  };

  const handleJoinRoom = async () => {
    if (joinCode.length !== 6) return;
    try {
      await joinRoom(joinCode);
      setJoinCode("");
    } catch {
      // Store exposes friendly error text
    }
  };

  return (
    <View className="flex-1 px-4 pt-4">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Create Room Card */}
        <View className="bg-secondary rounded-2xl border border-border p-3.5 mb-5">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-lg bg-primary/20 items-center justify-center mr-2.5">
              <Plus color="#60a5fa" size={16} />
            </View>
            <Text className="text-foreground font-semibold text-[15px]">
              Create Room
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <BottomSheetTextInput
              value={createRoomName}
              onChangeText={setCreateRoomName}
              editable={!isBusy}
              placeholder="Room name  e.g. Friday Meetup"
              placeholderTextColor="#8e8e93"
              className="flex-1 bg-background text-foreground px-3.5 py-2.5 rounded-xl border border-border text-sm"
            />

            <TouchableOpacity
              onPress={handleCreateRoom}
              disabled={isBusy || !createRoomName.trim()}
              className="bg-primary px-4 py-2.5 rounded-xl items-center justify-center"
              style={{ opacity: isBusy || !createRoomName.trim() ? 0.6 : 1 }}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-semibold text-sm">Create</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Reusable production-standard Alert/Config Placeholder Dropdown */}
          <TouchableOpacity
            onPress={() => setIsConfigExpanded(!isConfigExpanded)}
            className="mt-3.5 py-2 flex-row items-center justify-between border-t border-border/30"
            activeOpacity={0.7}
          >
            <Text className="text-muted text-xs font-medium">
              + Add details (limit, expiry, private)
            </Text>
            {isConfigExpanded ? (
              <ChevronUp color="#8e8e93" size={14} />
            ) : (
              <ChevronDown color="#8e8e93" size={14} />
            )}
          </TouchableOpacity>

          {isConfigExpanded && (
            <View className="mt-2 p-3 bg-background/50 rounded-xl border border-border/50 gap-y-3.5">
              {/* Max Members */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-2">
                  <Users color="#8e8e93" size={14} />
                  <Text className="text-zinc-300 text-xs">Max Members</Text>
                </View>
                <View className="flex-row gap-x-1.5">
                  {["No limit", "5", "10"].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setMaxMembers(opt)}
                      className={`px-2 py-1 rounded-md border ${
                        maxMembers === opt
                          ? "bg-primary/20 border-primary"
                          : "bg-secondary/40 border-border"
                      }`}
                    >
                      <Text
                        className={`text-[10px] ${
                          maxMembers === opt
                            ? "text-primary font-bold"
                            : "text-muted"
                        }`}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Expiry */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-2">
                  <Clock color="#8e8e93" size={14} />
                  <Text className="text-zinc-300 text-xs">Room Expiry</Text>
                </View>
                <View className="flex-row gap-x-1.5">
                  {["Never", "1 hr", "24 hr"].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setExpiry(opt)}
                      className={`px-2 py-1 rounded-md border ${
                        expiry === opt
                          ? "bg-primary/20 border-primary"
                          : "bg-secondary/40 border-border"
                      }`}
                    >
                      <Text
                        className={`text-[10px] ${
                          expiry === opt
                            ? "text-primary font-bold"
                            : "text-muted"
                        }`}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Private Switch */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-x-2">
                  <Shield color="#8e8e93" size={14} />
                  <Text className="text-zinc-300 text-xs">Private Room</Text>
                </View>
                <Switch
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  trackColor={{ false: "#3f3f46", true: "#1d4ed8" }}
                  thumbColor={isPrivate ? "#3b82f6" : "#a1a1aa"}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>

              <Text className="text-[10px] text-zinc-500 italic text-center border-t border-border/30 pt-2">
                Advanced Options are preview and coming soon
              </Text>
            </View>
          )}
        </View>

        {/* OR divider */}
        <View className="flex-row items-center mb-5">
          <View className="flex-1 h-px bg-border" />
          <Text className="text-muted text-[11px] font-semibold mx-3 tracking-wider">
            OR
          </Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        {/* Join a Room Section */}
        <Text className="text-muted text-xs font-bold uppercase tracking-wider mb-3">
          Join a Room
        </Text>

        <TouchableOpacity
          onPress={() => {
            setIsConfigExpanded(false);
            inputRef.current?.focus();
          }}
          activeOpacity={0.9}
          className="bg-secondary rounded-2xl border border-border p-4 mb-3 relative"
        >
          <JoinCodeBoxes value={joinCode} />

          {/* Hidden input drives the boxes above */}
          <BottomSheetTextInput
            ref={inputRef}
            value={joinCode}
            onChangeText={(value) => setJoinCode(normalizeRoomCode(value))}
            onFocus={() => setIsConfigExpanded(false)}
            editable={!isBusy}
            maxLength={6}
            autoCapitalize="characters"
            placeholder=""
            style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleJoinRoom}
          disabled={isBusy || joinCode.length !== 6}
          className="bg-primary py-3.5 rounded-2xl items-center flex-row justify-center"
          style={{ opacity: isBusy || joinCode.length !== 6 ? 0.5 : 1 }}
        >
          {actionLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <LogIn color="#fff" size={18} className="mr-2" />
              <Text className="text-white font-bold text-base">Join Room</Text>
            </>
          )}
        </TouchableOpacity>

        <Text className="text-muted text-xs leading-5 mt-4 px-1 text-center">
          Share the 6-letter code with your group to meet on the map.
        </Text>

        {error && (
          <View className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 flex-row items-center">
            <XCircle color="#f87171" size={14} />
            <Text className="text-red-300 text-xs ml-2 flex-1">{error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
