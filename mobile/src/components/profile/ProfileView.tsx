import React, { useState } from 'react';
import { statusCodes } from '@react-native-google-signin/google-signin';
import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useRoomStore, useAlertStore } from '@/store';
import { authService } from '@/services';
import { staticProfileGroups, ProfileActionType } from '@/config/profile.config';

// ─── Row component ────────────────────────────────────────────────────────

const Row = ({
  iconBg,
  icon,
  label,
  labelColor = 'text-white',
  right,
  onPress,
  disabled = false,
}: {
  iconBg: string;
  icon: React.ReactNode;
  label: string;
  labelColor?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    className="flex-row items-center px-3.5 h-[52px] active:opacity-75"
  >
    {/* Icon */}
    <View className={`w-[30px] h-[30px] rounded-lg items-center justify-center mr-3 overflow-hidden ${iconBg}`}>
      {icon}
    </View>

    {/* Label */}
    <Text className={`flex-1 text-[15px] ${labelColor}`}>{label}</Text>

    {/* Right slot */}
    {right}
  </Pressable>
);

// ─── Group card: rounded container with inset dividers ────────────────────

const GroupCard = ({ children }: { children: React.ReactNode }) => {
  const rows = React.Children.toArray(children);
  return (
    <View className="mx-4 bg-[#0f172a] rounded-2xl border border-[#1F2937] overflow-hidden">
      {rows.map((row, i) => (
        <View key={i}>
          {row}
          {i < rows.length - 1 && (
            // Inset divider — starts at 56px (14 pad + 30 icon + 12 gap)
            <View className="pl-14 pr-3.5">
              <View className="h-px bg-[#1e2a38]" />
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

// ─── Profile View Component ───────────────────────────────────────────────

export function ProfileView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthLoading, setSession, clearSession } = useAuthStore();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const showAlert = useAlertStore((s) => s.showAlert);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const session = await authService.signInWithGoogle();
      await setSession(session);
      // Sign-in already returns current room state — apply it directly (no
      // separate loadCurrentRoom round-trip).
      useRoomStore.getState().applyRoomSnapshot(session.room, session.members);
    } catch (error: any) {
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error('Google Sign-In Failure:', error);
        const errMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        showAlert('Sign-In Failed', `Could not complete Google Sign-In. Details: ${errMsg}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearSession();
          } catch {
            showAlert('Sign-Out Failed', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const handleMenuPress = (actionId: ProfileActionType) => {
    switch (actionId) {
      case 'theme':
        // Future: handle theme change
        break;
      case 'notifications':
        // Future: handle notifications change
        break;
      case 'help':
        // Future: handle help
        break;
      case 'about':
        // Future: handle about
        break;
    }
  };

  return (
    <View
      className="flex-1 bg-[#030712]"
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      {/* ── Nav bar ─────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#1F2937]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center active:opacity-70"
          hitSlop={8}
        >
          <ChevronLeft color="#F9FAFB" size={26} />
        </Pressable>
        <Text className="text-[17px] font-semibold text-white">Account</Text>
        <View className="w-10" />
      </View>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {isAuthLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Identity strip ──────────────────────────────────────────── */}
          <View className="flex-row items-center px-5 py-5 border-b border-[#1F2937]">
            {/* Avatar */}
            <View
              className={`w-14 h-14 rounded-full items-center justify-center overflow-hidden mr-4 bg-[#0f172a] ${
                user ? 'border-2 border-blue-500' : 'border border-[#1F2937]'
              }`}
            >
              {user?.picture ? (
                <Image source={{ uri: user.picture }} className="w-full h-full" />
              ) : (
                <User color={user ? '#3B82F6' : '#6B7280'} size={28} />
              )}
            </View>

            {/* Name + subtitle */}
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-white mb-0.5" numberOfLines={1}>
                {user?.name ?? 'Guest'}
              </Text>
              <Text className="text-[13px] text-gray-400" numberOfLines={1}>
                {user?.email ?? 'Sign in to unlock rooms & sync'}
              </Text>
            </View>
          </View>

          <View className="mt-6 gap-y-4">
            {/* ── Sign In row (guest only) ─────────────────────────────── */}
            {!user && (
              <GroupCard>
                <Row
                  iconBg="bg-blue-600"
                  icon={
                    isSigningIn ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Image
                        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                        className="w-5 h-5"
                      />
                    )
                  }
                  label={isSigningIn ? 'Connecting…' : 'Sign in with Google'}
                  labelColor="font-semibold text-white"
                  right={<Text className="text-[13px] font-semibold text-blue-500">Connect →</Text>}
                  onPress={handleGoogleSignIn}
                  disabled={isSigningIn}
                />
              </GroupCard>
            )}

            {/* ── Preferences & Support groups (mapped dynamically) ─────────── */}
            {staticProfileGroups.map((group) => (
              <GroupCard key={group.id}>
                {group.items.map((item) => (
                  <Row
                    key={item.id}
                    iconBg={item.iconBg}
                    icon={item.icon}
                    label={item.label}
                    right={item.right}
                    onPress={() => handleMenuPress(item.id)}
                  />
                ))}
              </GroupCard>
            ))}

            {/* ── Sign Out (signed-in only) ────────────────────────────── */}
            {user && (
              <GroupCard>
                <Row
                  iconBg="bg-blue-900/30"
                  icon={<LogOut size={16} color="#ef4444" />}
                  label="Sign Out"
                  labelColor="text-red-500"
                  onPress={handleSignOut}
                />
              </GroupCard>
            )}
          </View>

          {/* ── Terms (guest only) ──────────────────────────────────────── */}
          {!user && (
            <Text className="text-xs text-gray-500 text-center mt-6 px-8 leading-relaxed">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </Text>
          )}

          {/* ── Version ─────────────────────────────────────────────────── */}
          <Text className="text-[11px] text-gray-600 text-center mt-4 opacity-60">
            CoordNav v0.1.0
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
