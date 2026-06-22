import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAppStore, useMapStore } from '../../store';
import { HomeSheet, CreateRoomSheet, InRoomActiveSheet, PlaceDetailsSheet } from './views';

export function MainBottomSheet() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const uiState = useAppStore((s) => s.uiState);
  const mapState = useMapStore((s) => s.state);

  const isPreviewingPlace = mapState.kind === 'PREVIEW_PLACE';

  const snapPoints = useMemo(() => {
    if (isPreviewingPlace) {
      return ['32%', '70%'];
    }
    return ['12%', '45%', '85%'];
  }, [isPreviewingPlace]);

  useEffect(() => {
    if (isPreviewingPlace) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.snapToIndex(1);
    }
  }, [isPreviewingPlace]);

  const renderContent = () => {
    if (isPreviewingPlace) {
      return (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ flex: 1 }}>
          <PlaceDetailsSheet />
        </Animated.View>
      );
    }

    switch (uiState) {
      case 'Home':
        return (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ flex: 1 }}>
            <HomeSheet />
          </Animated.View>
        );
      case 'CreateRoom':
        return (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ flex: 1 }}>
            <CreateRoomSheet />
          </Animated.View>
        );
      case 'InRoom':
        return (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ flex: 1 }}>
            <InRoomActiveSheet />
          </Animated.View>
        );
      default:
        return (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={{ flex: 1 }}>
            <HomeSheet />
          </Animated.View>
        );
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={1}
      backgroundStyle={{ backgroundColor: '#1e1e1e', borderRadius: 0 }}
      handleIndicatorStyle={{ backgroundColor: '#2c2c2e', width: 40 }}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustPan"
      enablePanDownToClose={false}
      enableOverDrag={false}
    >
      <BottomSheetView style={styles.container}>
        {renderContent()}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});