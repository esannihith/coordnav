import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@googlemaps/react-native-navigation-sdk';
import { useAppStore } from '../../../store/useAppStore';
import { useRoomStore } from '../../../store/useRoomStore';
import { stopNavigation } from '../../../services/navigationService';
import { useToastStore } from '../../../store/useToastStore';

function formatETA(secondsRemaining: number): string {
  const now = new Date();
  const eta = new Date(now.getTime() + secondsRemaining * 1000);
  const hours = eta.getHours();
  const minutes = eta.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return '< 1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

export function NavTab() {
  const destination = useAppStore((s) => s.destination);
  const isNavSessionActive = useAppStore((s) => s.isNavSessionActive);
  const endNavSession = useAppStore((s) => s.endNavSession);
  const isInRoom = useRoomStore((s) => s.isInRoom);
  const toastInfo = useToastStore((s) => s.info);
  const toastError = useToastStore((s) => s.error);

  const { navigationController, setOnRemainingTimeOrDistanceChanged, setOnArrival } = useNavigation();

  const [eta, setEta] = useState('--:--');
  const [duration, setDuration] = useState('--');
  const [distance, setDistance] = useState('--');

  const fetchTimeAndDistance = useCallback(async () => {
    try {
      const td = await navigationController.getCurrentTimeAndDistance();
      if (td) {
        setEta(formatETA(td.seconds));
        setDuration(formatDuration(td.seconds));
        setDistance(formatDistance(td.meters));
      }
    } catch (e) {
      // Navigation may not be active yet
    }
  }, [navigationController]);

  useEffect(() => {
    if (!isNavSessionActive) {
      endNavSession(isInRoom ? 'InRoom' : 'Home');
    }
  }, [isNavSessionActive, isInRoom, endNavSession]);

  useEffect(() => {
    // Initial fetch
    fetchTimeAndDistance();

    // Live updates
    setOnRemainingTimeOrDistanceChanged(() => {
      fetchTimeAndDistance();
    });

    setOnArrival((event) => {
      if (event.isFinalDestination) {
        toastInfo(`Arrived at ${destination?.displayName?.text || 'your destination'}.`, { title: 'Arrived' });
        handleEndNavigation();
      } else {
        navigationController.continueToNextDestination();
        navigationController.startGuidance();
      }
    });

    return () => {
      setOnRemainingTimeOrDistanceChanged(null);
      setOnArrival(null);
    };
  }, [
    navigationController,
    fetchTimeAndDistance,
    setOnRemainingTimeOrDistanceChanged,
    setOnArrival,
    destination,
  ]);

  const handleEndNavigation = async () => {
    try {
      await stopNavigation(navigationController);
    } catch {
      toastError('Could not fully stop navigation. UI session was reset.');
    } finally {
      endNavSession(isInRoom ? 'InRoom' : 'Home');
    }
  };

  return (
    <View className="flex-1 px-4 py-2">
      {/* ETA + End row */}
      <View className="flex-row items-end justify-between mb-4">
        <View>
          <Text className="text-4xl font-bold text-green-500">{eta}</Text>
          <Text className="text-lg text-muted mt-1">{duration} • {distance}</Text>
          {destination && (
            <Text className="text-sm text-foreground/60 mt-1" numberOfLines={1}>
              {destination.displayName?.text}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          className="bg-red-500/20 px-6 py-3 rounded-full flex-row items-center"
          onPress={handleEndNavigation}
        >
          <MaterialIcons name="close" size={24} color="#ef4444" />
          <Text className="text-red-500 font-bold ml-2 text-lg">End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
