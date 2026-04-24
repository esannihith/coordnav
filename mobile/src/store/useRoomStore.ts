import { create } from 'zustand';
import * as Location from 'expo-location';
import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';
import { useAuthStore } from './useAuthStore';
import { useAppStore, type PlaceData } from './useAppStore';
import { useToastStore } from './useToastStore';
import {
  type ChatMessage,
  type ChatPlacePayload,
  formatRoomError,
  normalizeRoomCode,
  roomService,
  type RoomMember,
} from '../services/roomService';

type RoomActionState = 'idle' | 'creating' | 'joining' | 'leaving' | 'ending';
type ShareStatus = 'off' | 'starting' | 'on' | 'paused' | 'error';

interface RoomStoreState {
  currentRoomCode: string | null;
  currentRoomName: string | null;
  ownerUid: string | null;
  isInRoom: boolean;
  isOwner: boolean;
  members: RoomMember[];
  messages: ChatMessage[];

  actionState: RoomActionState;
  error: string | null;
  chatError: string | null;
  isSendingMessage: boolean;

  isSharing: boolean;
  shareIntentOn: boolean;
  shareStatus: ShareStatus;
  memberEventsPrimed: boolean;

  roomUnsubscribe: (() => void) | null;
  membersUnsubscribe: (() => void) | null;
  messagesUnsubscribe: (() => void) | null;
  locationSubscription: Location.LocationSubscription | null;
  appStateSubscription: NativeEventSubscription | null;

  createRoom: (roomName: string) => Promise<void>;
  joinRoom: (roomCode: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  endRoom: () => Promise<void>;
  toggleSharing: (enabled: boolean) => Promise<void>;

  startListeners: (roomCode: string) => void;
  stopListeners: () => void;
  startChatListener: (roomCode: string) => void;
  stopChatListener: () => void;
  sendChatText: (text: string) => Promise<boolean>;
  sharePlaceToChat: (placeData: PlaceData) => Promise<boolean>;
  clearRoomState: () => Promise<void>;

  setError: (message: string | null) => void;

  _startForegroundSharing: () => Promise<boolean>;
  _stopForegroundSharing: (updateBackend: boolean, nextStatus?: ShareStatus) => Promise<void>;
  _ensureAppStateListener: () => void;
  _removeAppStateListener: () => void;
  _handleRoomClosed: (reason: string) => Promise<void>;
  _handleAppStateChange: (nextState: AppStateStatus) => Promise<void>;
}

function requireAuthUser() {
  const user = useAuthStore.getState().user;
  if (!user) {
    throw new Error('Please sign in with Google to use rooms.');
  }
  return user;
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return /permission[_\s-]?denied/i.test(error.message);
}

function enterRoomUi() {
  useAppStore.getState().setUiStateAndTab('InRoom', 'Room');
}

function exitRoomUi() {
  const appStore = useAppStore.getState();

  if (appStore.isNavSessionActive) {
    appStore.setUiStateAndTab('NavigatingSolo', 'Nav');
    return;
  }

  if (appStore.uiState === 'InRoomGetDirections') {
    appStore.setUiStateAndTab('GetDirections', 'Directions');
    return;
  }

  appStore.setUiStateAndTab('Home', 'Search');
}

function initialRoomState() {
  return {
    currentRoomCode: null,
    currentRoomName: null,
    ownerUid: null,
    isInRoom: false,
    isOwner: false,
    members: [] as RoomMember[],
    messages: [] as ChatMessage[],
    actionState: 'idle' as RoomActionState,
    error: null as string | null,
    chatError: null as string | null,
    isSendingMessage: false,
    isSharing: false,
    shareIntentOn: false,
    shareStatus: 'off' as ShareStatus,
    memberEventsPrimed: false,
    roomUnsubscribe: null as (() => void) | null,
    membersUnsubscribe: null as (() => void) | null,
    messagesUnsubscribe: null as (() => void) | null,
    locationSubscription: null as Location.LocationSubscription | null,
    appStateSubscription: null as NativeEventSubscription | null,
  };
}

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  ...initialRoomState(),

  setError: (message) => set({ error: message }),

  _ensureAppStateListener: () => {
    if (get().appStateSubscription) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      void get()._handleAppStateChange(nextState);
    });

    set({ appStateSubscription: subscription });
  },

  _removeAppStateListener: () => {
    const subscription = get().appStateSubscription;
    subscription?.remove();
    set({ appStateSubscription: null });
  },

  _handleAppStateChange: async (nextState) => {
    const state = get();

    if (!state.isInRoom || !state.shareIntentOn) {
      return;
    }

    if (nextState !== 'active' && state.isSharing) {
      await state._stopForegroundSharing(true, 'paused');
      return;
    }

    if (nextState === 'active' && !state.isSharing) {
      const resumed = await state._startForegroundSharing();
      if (!resumed) {
        set({ shareIntentOn: false });
      }
    }
  },

  _startForegroundSharing: async () => {
    const { currentRoomCode } = get();
    if (!currentRoomCode) {
      return false;
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      useToastStore.getState().error('Sign in expired. Please sign in again.');
      set({
        isSharing: false,
        shareStatus: 'error',
        error: 'Sign in expired. Please sign in again.',
      });
      return false;
    }

    set({ shareStatus: 'starting', error: null });

    await get()._stopForegroundSharing(false, 'starting');

    try {
      await Location.enableNetworkProviderAsync();

      const currentPermission = await Location.getForegroundPermissionsAsync();
      if (currentPermission.status !== 'granted') {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (requested.status !== 'granted') {
          throw new Error('Location permission is required to share live location.');
        }
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await roomService.updateLiveLocation(
        currentRoomCode,
        user.uid,
        currentPosition.coords.latitude,
        currentPosition.coords.longitude
      );
      await roomService.setSharing(currentRoomCode, user.uid, true);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15_000,
          distanceInterval: 10,
        },
        (location) => {
          const state = get();
          if (!state.isInRoom || !state.currentRoomCode || !state.shareIntentOn) {
            return;
          }

          void roomService.updateLiveLocation(
            state.currentRoomCode,
            user.uid,
            location.coords.latitude,
            location.coords.longitude
          ).catch((error) => {
            set({ error: formatRoomError(error) });
          });
        }
      );

      set({
        locationSubscription: subscription,
        isSharing: true,
        shareStatus: 'on',
        error: null,
      });

      return true;
    } catch (error) {
      useToastStore.getState().error(formatRoomError(error), { title: 'Sharing Error' });
      set({
        locationSubscription: null,
        isSharing: false,
        shareStatus: 'error',
        error: formatRoomError(error),
      });
      return false;
    }
  },

  _stopForegroundSharing: async (updateBackend, nextStatus = 'off') => {
    const state = get();
    const currentRoomCode = state.currentRoomCode;
    const user = useAuthStore.getState().user;

    state.locationSubscription?.remove();

    if (updateBackend && currentRoomCode && user) {
      await roomService.setSharing(currentRoomCode, user.uid, false).catch(() => undefined);
    }

    set({
      locationSubscription: null,
      isSharing: false,
      shareStatus: nextStatus,
    });
  },

  startListeners: (roomCodeInput) => {
    const roomCode = normalizeRoomCode(roomCodeInput);
    if (!roomCode) {
      return;
    }

    get().stopListeners();

    const roomUnsubscribe = roomService.subscribeRoom(
      roomCode,
      (room) => {
        if (!room) {
          void get()._handleRoomClosed('This room has ended.');
          return;
        }

        const user = useAuthStore.getState().user;
        set({
          currentRoomCode: room.roomCode,
          currentRoomName: room.roomName,
          ownerUid: room.ownerUid,
          isOwner: Boolean(user && room.ownerUid === user.uid),
          isInRoom: true,
        });
      },
      (error) => {
        set({ error: formatRoomError(error) });
      }
    );

    const membersUnsubscribe = roomService.subscribeMembers(
      roomCode,
      (members) => {
        const user = useAuthStore.getState().user;
        const previousMembers = get().members;
        const wasPrimed = get().memberEventsPrimed;
        set((state) => ({
          members,
          isOwner: Boolean(user && state.ownerUid === user.uid),
          memberEventsPrimed: true,
        }));

        if (!wasPrimed) {
          return;
        }

        const previousIds = new Set(previousMembers.map((member) => member.uid));
        const nextIds = new Set(members.map((member) => member.uid));

        const joinedMembers = members.filter((member) => !previousIds.has(member.uid));
        const leftMembers = previousMembers.filter((member) => !nextIds.has(member.uid));

        joinedMembers.forEach((member) => {
          if (member.uid === user?.uid) {
            return;
          }
          useToastStore.getState().info(`${member.displayName} joined the room.`, { title: 'Member Joined' });
        });

        leftMembers.forEach((member) => {
          if (member.uid === user?.uid) {
            return;
          }
          useToastStore.getState().info(`${member.displayName} left the room.`, { title: 'Member Left' });
        });
      },
      (error) => {
        set({ error: formatRoomError(error) });
      }
    );

    set({ roomUnsubscribe, membersUnsubscribe });
    get().startChatListener(roomCode);
  },

  stopListeners: () => {
    const state = get();
    state.roomUnsubscribe?.();
    state.membersUnsubscribe?.();
    state.messagesUnsubscribe?.();
    set({
      roomUnsubscribe: null,
      membersUnsubscribe: null,
      messagesUnsubscribe: null,
      messages: [],
      chatError: null,
      isSendingMessage: false,
      memberEventsPrimed: false,
    });
  },

  startChatListener: (roomCodeInput) => {
    const roomCode = normalizeRoomCode(roomCodeInput);
    if (!roomCode) {
      return;
    }

    get().stopChatListener();

    const messagesUnsubscribe = roomService.subscribeMessages(
      roomCode,
      (messages) => {
        set({ messages, chatError: null });
      },
      (error) => {
        set({ chatError: formatRoomError(error) });
      }
    );

    set({ messagesUnsubscribe });
  },

  stopChatListener: () => {
    const state = get();
    state.messagesUnsubscribe?.();
    set({
      messagesUnsubscribe: null,
      messages: [],
      chatError: null,
      isSendingMessage: false,
    });
  },

  sendChatText: async (textInput) => {
    const state = get();
    if (state.isSendingMessage) {
      return false;
    }

    const text = textInput.trim();
    if (!text || !state.currentRoomCode || !state.isInRoom) {
      return false;
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      set({ chatError: 'Please sign in to send messages.' });
      useToastStore.getState().error('Please sign in to send messages.');
      return false;
    }

    set({ isSendingMessage: true, chatError: null });

    try {
      await roomService.sendTextMessage(state.currentRoomCode, user, text);
      set({ isSendingMessage: false });
      return true;
    } catch (error) {
      const message = formatRoomError(error);
      set({ isSendingMessage: false, chatError: message });
      useToastStore.getState().error(message, { title: 'Chat Send Failed' });
      return false;
    }
  },

  sharePlaceToChat: async (placeData) => {
    const state = get();
    if (state.isSendingMessage) {
      return false;
    }

    if (!state.currentRoomCode || !state.isInRoom) {
      return false;
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      set({ chatError: 'Please sign in to share places.' });
      useToastStore.getState().error('Please sign in to share places.');
      return false;
    }

    if (!placeData?.id) {
      set({ chatError: 'Could not share this place.' });
      useToastStore.getState().error('Could not share this place.', { title: 'Share Failed' });
      return false;
    }

    const payload: ChatPlacePayload = {
      id: placeData.id,
      name: placeData.displayName?.text || placeData.name || 'Shared Place',
      address: placeData.formattedAddress || 'No address',
      lat: placeData.location?.lat ?? null,
      lng: placeData.location?.lng ?? null,
    };

    set({ isSendingMessage: true, chatError: null });

    try {
      await roomService.sendPlaceMessage(state.currentRoomCode, user, payload);
      set({ isSendingMessage: false });
      useToastStore.getState().success('Place shared to chat.', { title: 'Shared' });
      return true;
    } catch (error) {
      const message = formatRoomError(error);
      set({ isSendingMessage: false, chatError: message });
      useToastStore.getState().error(message, { title: 'Share Failed' });
      return false;
    }
  },

  _handleRoomClosed: async (reason) => {
    const state = get();
    if (!state.currentRoomCode && !state.isInRoom) {
      return;
    }

    await state._stopForegroundSharing(false, 'off');
    state.stopListeners();
    state._removeAppStateListener();

    set({
      ...initialRoomState(),
      error: reason,
    });

    useToastStore.getState().info(reason || 'Room was closed.');
    exitRoomUi();
  },

  clearRoomState: async () => {
    const state = get();
    await state._stopForegroundSharing(false, 'off');
    state.stopListeners();
    state._removeAppStateListener();
    set({ ...initialRoomState() });
  },

  createRoom: async (roomName) => {
    const current = get();
    if (current.actionState !== 'idle') {
      return;
    }

    const user = requireAuthUser();

    set({ actionState: 'creating', error: null });

    try {
      const created = await roomService.createRoom(user, roomName);

      set({
        currentRoomCode: created.roomCode,
        currentRoomName: created.roomName,
        ownerUid: user.uid,
        isOwner: true,
        isInRoom: true,
        members: [],
        messages: [],
        error: null,
        chatError: null,
      });

      get()._ensureAppStateListener();
      get().startListeners(created.roomCode);
      enterRoomUi();
      useToastStore.getState().success(`Room ${created.roomCode} is ready.`, { title: 'Room Created' });

      set({ shareIntentOn: true });
      const started = await get()._startForegroundSharing();
      if (!started) {
        set({ shareIntentOn: false });
      }

      set({ actionState: 'idle' });
    } catch (error) {
      set({
        actionState: 'idle',
        error: formatRoomError(error),
      });
      useToastStore.getState().error(formatRoomError(error), { title: 'Create Room Failed' });
      throw error;
    }
  },

  joinRoom: async (roomCodeInput) => {
    const current = get();
    if (current.actionState !== 'idle') {
      return;
    }

    const user = requireAuthUser();

    set({ actionState: 'joining', error: null });

    try {
      const joinedRoom = await roomService.joinRoom(roomCodeInput, user);

      set({
        currentRoomCode: joinedRoom.roomCode,
        currentRoomName: joinedRoom.roomName,
        ownerUid: joinedRoom.ownerUid,
        isOwner: joinedRoom.ownerUid === user.uid,
        isInRoom: true,
        members: [],
        messages: [],
        error: null,
        chatError: null,
      });

      get()._ensureAppStateListener();
      get().startListeners(joinedRoom.roomCode);
      enterRoomUi();
      useToastStore.getState().success(`Joined room ${joinedRoom.roomCode}.`, { title: 'Joined Room' });

      set({ shareIntentOn: true });
      const started = await get()._startForegroundSharing();
      if (!started) {
        set({ shareIntentOn: false });
      }

      set({ actionState: 'idle' });
    } catch (error) {
      set({
        actionState: 'idle',
        error: formatRoomError(error),
      });
      useToastStore.getState().error(formatRoomError(error), { title: 'Join Room Failed' });
      throw error;
    }
  },

  leaveRoom: async () => {
    const state = get();
    if (!state.currentRoomCode || state.actionState !== 'idle') {
      return;
    }

    const user = requireAuthUser();
    set({ actionState: 'leaving', error: null });

    try {
      await state._stopForegroundSharing(false, 'off');
      await roomService.leaveRoom(state.currentRoomCode, user.uid);

      state.stopListeners();
      state._removeAppStateListener();

      set({ ...initialRoomState() });
      exitRoomUi();
      useToastStore.getState().info('You left the room.');
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        state.stopListeners();
        state._removeAppStateListener();
        set({
          ...initialRoomState(),
          error: 'Firestore permission denied. Local room state was reset.',
        });
        exitRoomUi();
        useToastStore.getState().error(
          'Firestore permission denied. Publish latest Firestore rules and try again.',
          { title: 'Rules Update Needed' }
        );
        return;
      }

      set({
        actionState: 'idle',
        error: formatRoomError(error),
      });
      useToastStore.getState().error(formatRoomError(error), { title: 'Leave Room Failed' });
      throw error;
    }

    set({ actionState: 'idle' });
  },

  endRoom: async () => {
    const state = get();
    if (!state.currentRoomCode || state.actionState !== 'idle') {
      return;
    }

    const user = requireAuthUser();
    set({ actionState: 'ending', error: null });

    try {
      await state._stopForegroundSharing(false, 'off');
      await roomService.endRoom(state.currentRoomCode, user.uid);

      state.stopListeners();
      state._removeAppStateListener();

      set({ ...initialRoomState() });
      exitRoomUi();
      useToastStore.getState().info('Room ended for everyone.', { title: 'Room Ended' });
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        state.stopListeners();
        state._removeAppStateListener();
        set({
          ...initialRoomState(),
          error: 'Firestore permission denied. Local room state was reset.',
        });
        exitRoomUi();
        useToastStore.getState().error(
          'Firestore permission denied. Publish latest Firestore rules and try again.',
          { title: 'Rules Update Needed' }
        );
        return;
      }

      set({
        actionState: 'idle',
        error: formatRoomError(error),
      });
      useToastStore.getState().error(formatRoomError(error), { title: 'End Room Failed' });
      throw error;
    }

    set({ actionState: 'idle' });
  },

  toggleSharing: async (enabled) => {
    const state = get();
    if (!state.currentRoomCode) {
      return;
    }

    if (enabled) {
      set({ shareIntentOn: true, error: null });
      const started = await state._startForegroundSharing();
      if (!started) {
        set({ shareIntentOn: false, isSharing: false, shareStatus: 'off' });
      } else {
        useToastStore.getState().success('Live location sharing is on.', { title: 'Sharing Enabled' });
      }
      return;
    }

    set({ shareIntentOn: false, error: null });
    await state._stopForegroundSharing(true, 'off');
    useToastStore.getState().info('Live location sharing is off.', { title: 'Sharing Disabled' });
  },
}));
