import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useAppStore, useMapStore } from '../../store';
import { HomeSheet, CreateRoomSheet, InRoomActiveSheet, PlaceDetailsSheet } from './views';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function MainBottomSheet() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const uiState = useAppStore((s) => s.uiState);
  const mapState = useMapStore((s) => s.state);

  const isPreviewingPlace = mapState.kind === 'PREVIEW_PLACE';

  // Declarative two-layer model: a persistent base (Home/InRoom) and an optional
  // overlay (CreateRoom/PlaceDetails) that slides up over it. Views are derived
  // purely from state — nothing is imperatively pushed.
  const baseView = uiState === 'InRoom' ? 'inRoom' : 'home';
  const overlayView: 'place' | 'create' | null = isPreviewingPlace
    ? 'place'
    : uiState === 'CreateRoom'
      ? 'create'
      : null;

  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => {
    // Guarantee exactly 120 logical pixels of safe space above the bottom inset
    const peekHeight = 120 + insets.bottom;
    return [peekHeight, '45%', '70%'];
  }, [insets.bottom]);

  useEffect(() => {
    // Whenever the base view or overlay view changes, snap to default (index 1)
    bottomSheetRef.current?.snapToIndex(1);
  }, [baseView, overlayView]);

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
      enableDynamicSizing={false}
    >
      <BottomSheetView style={styles.container}>
        {/* Base layer — flex:1 so it gives the sheet content its height; always
            mounted so its state is preserved while an overlay covers it, and so
            it's revealed when the overlay slides away. */}
        <Animated.View
          key={baseView}
          entering={FadeIn.duration(200)}
          style={styles.container}
        >
          {baseView === 'inRoom' ? <InRoomActiveSheet /> : <HomeSheet />}
        </Animated.View>

        {/* Overlay layer — opaque, on top; slides up over the base on mount and
            slides down to reveal it on unmount (Apple-Maps style). */}
        {overlayView && (
          <Animated.View
            key={overlayView}
            entering={SlideInDown.duration(280)}
            exiting={SlideOutDown.duration(240)}
            style={[StyleSheet.absoluteFill, styles.overlay]}
          >
            {overlayView === 'place' ? <PlaceDetailsSheet /> : <CreateRoomSheet />}
          </Animated.View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    backgroundColor: '#1e1e1e',
  },
});
