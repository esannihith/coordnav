import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  User,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Moon,
  MapPin,
  Bell,
  FileText,
  Lock,
  Info,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';

// ─── Reusable components (polished with NativeWind) ────────────────────────

const SettingsRow = ({
  icon,
  label,
  value,
  onPress,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    className={`flex-row items-center px-4 py-3.5 min-h-[52px] ${
      destructive ? '' : ''
    }`}
  >
    <View className="w-7 items-center mr-3">{icon}</View>
    <Text
      className={`flex-1 text-base ${
        destructive ? 'text-red-500' : 'text-white'
      }`}
    >
      {label}
    </Text>
    {value ? (
      <Text className="text-sm text-gray-400 mr-1">{value}</Text>
    ) : (
      <ChevronRight
        size={18}
        color={destructive ? '#EF4444' : '#6B7280'}
      />
    )}
  </TouchableOpacity>
);

const Section = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) => (
  <View className="px-4 mb-2">
    {label && (
      <Text className="text-xs font-semibold text-gray-400 tracking-wider mb-1.5 ml-1">
        {label}
      </Text>
    )}
    <View className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {children}
    </View>
  </View>
);

const RowDivider = () => <View className="h-px bg-gray-800 ml-12" />;

// ─── Main screen ──────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthLoading } = useAuthStore();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await authService.signInWithGoogle();
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Sign-In Failed', 'Could not complete Google Sign-In. Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.signOut();
          } catch {
            Alert.alert('Sign-Out Failed', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View
      className="flex-1 bg-gray-950"
      style={{ paddingTop: Math.max(insets.top, 16) }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center" hitSlop={8}>
          <ChevronLeft color="#F9FAFB" size={26} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-white">Account</Text>
        <View className="w-10" />
      </View>

      {/* Loading / signed-in / guest states */}
      {isAuthLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : user ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar card */}
          <View className="items-center py-7 px-6">
            <View className="w-[88px] h-[88px] rounded-full bg-gray-900 border-2 border-blue-500 items-center justify-center overflow-hidden mb-3.5">
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} className="w-full h-full" />
              ) : (
                <User color="#2563EB" size={44} />
              )}
            </View>
            <Text className="text-xl font-bold text-white mb-1 text-center max-w-[260px]" numberOfLines={1}>
              {user.displayName || 'User'}
            </Text>
            <Text className="text-sm text-gray-400 mb-3 text-center max-w-[260px]" numberOfLines={1}>
              {user.email}
            </Text>
            {/* Verified badge */}
            <View className="flex-row items-center gap-1.5 bg-green-500/10 rounded-full px-2.5 py-1">
              <ShieldCheck color="#22C55E" size={14} />
              <Text className="text-xs font-medium text-green-500">Verified via Google</Text>
            </View>
          </View>

          {/* Settings sections */}
          <Section label="APPEARANCE">
            <SettingsRow
              icon={<Moon color="#6B7280" size={18} />}
              label="Theme"
              value="System"
              onPress={() => {/* TODO: theme picker */}}
            />
          </Section>

          <Section label="PRIVACY">
            <SettingsRow
              icon={<MapPin color="#6B7280" size={18} />}
              label="Location Sharing"
              value="Rooms only"
              onPress={() => {/* TODO */}}
            />
            <RowDivider />
            <SettingsRow
              icon={<Bell color="#6B7280" size={18} />}
              label="Notifications"
              onPress={() => {/* TODO */}}
            />
          </Section>

          <Section label="ABOUT">
            <SettingsRow
              icon={<FileText color="#6B7280" size={18} />}
              label="Terms of Service"
              onPress={() => {/* TODO */}}
            />
            <RowDivider />
            <SettingsRow
              icon={<Lock color="#6B7280" size={18} />}
              label="Privacy Policy"
              onPress={() => {/* TODO */}}
            />
            <RowDivider />
            <SettingsRow
              icon={<Info color="#6B7280" size={18} />}
              label="Version"
              value="1.0.0"
            />
          </Section>

          {/* Sign out */}
          <Section>
            <SettingsRow
              icon={<LogOut color="#EF4444" size={18} />}
              label="Sign Out"
              onPress={handleSignOut}
              destructive
            />
          </Section>
        </ScrollView>
      ) : (
        /* Guest state */
        <View
          className="flex-1 px-6 pt-4 justify-center"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="items-center mb-9">
            <View className="w-20 h-20 rounded-full bg-gray-900 border border-gray-800 items-center justify-center mb-5">
              <User color="#6B7280" size={40} />
            </View>
            <Text className="text-2xl font-bold text-white mb-2.5 text-center">
              Sign in to CoordNav
            </Text>
            <Text className="text-[15px] text-gray-400 text-center leading-relaxed max-w-[280px]">
              Create rooms, track friends in real-time, and sync your favorite places.
            </Text>
          </View>

          {/* Google button */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
            activeOpacity={0.85}
            className={`flex-row items-center justify-center bg-white rounded-2xl py-4 px-6 gap-3 shadow-lg ${
              isSigningIn ? 'opacity-65' : ''
            }`}
          >
            {isSigningIn ? (
              <ActivityIndicator color="#0F1117" size="small" />
            ) : (
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                className="w-5 h-5"
              />
            )}
            <Text className="text-base font-bold text-gray-950">
              {isSigningIn ? 'Connecting…' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          <Text className="text-xs text-gray-400 text-center mt-5 leading-relaxed px-4">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      )}
    </View>
  );
}