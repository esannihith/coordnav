1. Core states & Firestore model (refined from my earlier service sketch)
Room doc (rooms/{roomCode}):
TypeScript{
  ownerUid: string,
  createdAt: Timestamp,
  isActive: boolean   // optional for future soft-close
}
Subcollection liveLocations/{uid} (one doc per participant):
TypeScript{
  displayName: string,
  photoURL?: string,
  location: GeoPoint,
  updatedAt: Timestamp
}
2. Owner flow (create → in-room → leave/end)

Create room (button in bottom sheet):
Generate code + check uniqueness (transaction).
Create room doc with ownerUid: currentUser.uid.
Auto-join: write own liveLocation doc.
Start location broadcast (see below).
Store currentRoomCode + isOwner: true in useRoomStore.

While in room:
“End Room” button visible only to owner → deletes entire room doc (or sets isActive: false + deletes all liveLocations). All clients detect deletion via snapshot and auto-leave.
Can still background or navigate away without ending (room stays alive for others).

Leave without ending (owner leaves like normal participant):
Same as participant leave (see below). Room continues for others.


3. Participant (non-owner) flow

Join room:
Enter code → check room exists + isActive.
Write own liveLocation doc.
Subscribe to liveLocations snapshot → update store + redraw markers on the persistent NavigationView (exactly like your existing polyline/marker logic).

In room:
Only “Leave Room” button.
No End Room.


4. Background behavior (most important part)
Android Expo apps must use expo-task-manager + background location task. Normal watchPositionAsync dies when app backgrounds.
Recommended implementation (in roomService + useRoomStore):

On join/create: Location.startLocationUpdatesAsync('room-location-task', { ... })
Task definition (in a new src/services/backgroundLocationTask.ts):TypeScriptTaskManager.defineTask('room-location-task', async ({ data: { locations } }) => {
  if (!locations?.[0]) return;
  const { latitude, longitude } = locations[0];
  const roomCode = useRoomStore.getState().currentRoomCode;
  if (roomCode) {
    await roomService.updateLiveLocation(roomCode, currentUser.uid, latitude, longitude);
  }
});
Throttling (critical for battery):
Foreground: every 5s or 10m movement.
Background: every 15-30s or 50m movement + accuracy: Location.Accuracy.Balanced.

Show persistent notification (Expo Notifications + foreground service config in app.json) so user knows “Sharing live location in ROOM-123”.
On AppState change to background: reduce frequency via store flag, keep task alive.
On foreground resume: restart normal watcher if needed + resync snapshot.

Permission flow (you’ll need this once):

expo-location request “always” permission with explanation: “To share live location with room members even when app is in background.”

5. Leave scenarios (explicit + implicit)
Explicit Leave / End Room (button press):

Stop background task: Location.stopLocationUpdatesAsync('room-location-task').
Delete own liveLocation doc.
If owner “End Room” → delete room doc (or all sub-docs).
Unsubscribe Firestore listener.
Clear useRoomStore (currentRoomCode, members, isOwner).
Redraw map: remove all room markers (your existing single-map pattern).
Optional: show “Left room” toast.

App goes to background:

Do nothing to stop — keep TaskManager alive.
Store last room state in AsyncStorage so on resume we can re-join if still active.

App killed / crash / force close:

Firestore onDisconnect() is your friend.
On join: liveLocationRef.onDisconnect().delete()
Presence auto-cleans within seconds. No zombie markers.

App reopen / cold start:

Check AsyncStorage for lastRoomCode.
If exists → attempt re-join (same as join flow). If room gone → clear storage and notify “Room ended”.

My suggestions / gotchas (don’t ignore these)

No cloud functions → we live with tiny race conditions on last-member-leave. Acceptable for MVP.
Stale locations: In snapshot listener, filter out members whose updatedAt > 15 min old (hide marker + show “offline” badge). Prevents ghost markers.
Battery & UX: Add toggle in room sheet: “Pause sharing” (stops task without leaving).
Deep linking: Future, but roomCode should open app directly into room (expo-router + universal links).
Testing order:
Implement background task + onDisconnect first (most painful).
Then owner/participant buttons.
Then resume logic + stale cleanup.