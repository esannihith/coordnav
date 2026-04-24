# Room Features: Implemented and Next TODOs

Last updated: 2026-04-25

## Implemented (MVP)

### 1) Firestore room model
- Collection: `rooms/{roomCode}`
  - Fields: `ownerUid`, `roomName`, `createdAt`, `isActive`
- Subcollection: `rooms/{roomCode}/liveLocations/{uid}`
  - Fields: `uid`, `displayName`, `photoURL`, `joinedAt`, `isSharing`, `location`, `updatedAt`

### 2) Room lifecycle
- Create room with generated 6-character unambiguous code.
- Join room by code with normalization and validation.
- Leave room.
- Owner handoff on owner leave (next earliest joined member becomes owner).
- Owner-only end room (deletes room + all member docs).
- Last owner leaving with no successor deletes the room.

### 3) Realtime sync
- Realtime listener for room document status.
- Realtime listener for member list.
- UI auto-exits room state if room doc is deleted/inactive.

### 4) Live location sharing
- Foreground-only sharing implemented.
- Auto-attempt share ON after create/join.
  - Requests/uses foreground location permission.
  - Calls `enableNetworkProviderAsync` on Android.
- Manual sharing toggle in Room tab.
- Sharing updates write `location` + `updatedAt` heartbeat.
- App background pauses foreground watcher; app active resumes if sharing intent remains ON.

### 5) Room UI and map integration
- Stub/mock RoomTab data removed.
- RoomTab now uses `useRoomStore` and Firestore-backed members.
- Member list shows sharing/offline state + last update text.
- Owner-only "End Room" + standard "Leave Room".
- Single-map architecture preserved:
  - Room member markers are drawn/removed as overlays on the same persistent map instance.
  - Markers shown in `InRoom` and `InRoomNavigating`.
  - Markers hidden if member sharing is OFF, missing location, or stale.

### 6) Store architecture cleanup
- Room domain moved out of `useAppStore` into dedicated `useRoomStore`.
- `useAppStore` now focuses on UI/search/directions/navigation state.
- In-room checks in relevant tabs/layout now come from `useRoomStore`.

### 7) Firestore API modernization
- `roomService` migrated to RNFirebase modular API (v22+ style):
  - `getFirestore`, `collection`, `doc`, `query`, `runTransaction`, `setDoc`, `deleteDoc`, `onSnapshot`, `serverTimestamp`, `GeoPoint`.
- This removes namespaced Firestore deprecation warnings produced by `firestore().*` usage.

### 8) Chat + share-to-chat
- Room chat collection implemented at `rooms/{roomCode}/messages`.
- Realtime room-scoped message stream in Chat tab (latest 100 messages).
- Supports:
  - text messages,
  - place-share messages (from Place tab `Share to Chat` action).
- `Share to Chat` now sends instantly and switches to Chat tab.

## Known limitations
- No background location task (`expo-task-manager`) yet.
- No auto-rejoin on cold app start.
- No cloud function-based cleanup/presence reconciliation.
- Chat is MVP only (no pagination/read receipts/edit-delete/replies/push).
- Firestore rules must be published from `mobile/firestore.rules` for owner leave/end flows to work.

## TODOs (prioritized)

### P0: Stability and correctness
- Add robust Firestore security rules for room and member writes.
- Add explicit error banners/toasts for create/join/share failures in all states.
- Add retry/backoff for transient location write failures.
- Add defensive handling for high-frequency snapshot churn.

### P1: Product completion (room domain)
- Add room code copy/share CTA (system share sheet + clipboard feedback).
- Add per-member details on marker tap (name, last update, sharing state).
- Add "owner transferred" UX message when ownership changes.

### P1: Chat enhancements
- Add message pagination / load older history.
- Add delivery/read indicators and optional typing state.
- Add richer place share cards with deep-link/open actions.

### P2: Location enhancement
- Implement background sharing with `expo-task-manager` and foreground service notification.
- Add battery-aware cadence policy (foreground vs background intervals).
- Add explicit "Pause sharing" vs "Leave room" UX distinction in all states.

### P2: Recovery and lifecycle
- Optional resume prompt (or auto-rejoin) strategy on app restart.
- Persist minimal room session metadata locally for recovery.

### P3: Ops and quality
- Add analytics events for create/join/leave/end/share toggle.
- Add E2E test scenarios (two-device room sync, owner transfer, room end, stale members).
- Add Firestore indexes/rule test cases for production hardening.

## Suggested manual verification checklist
1. Create room on device A, join same room on device B.
2. Confirm both members appear in list and on map markers.
3. Toggle sharing OFF on one device, verify marker disappears and status updates.
4. Leave room as owner with another member present; verify ownership transfers.
5. End room as owner; verify all participants are exited from room UI.
6. Start in-room navigation and confirm room markers remain visible.
