# Room Domain P1 Status

## Implemented in P1
- Firestore-backed room service for:
  - create room with collision-safe 6-char code,
  - join active room,
  - leave room with owner transfer to earliest joined member,
  - owner-only end room (deletes room + live member docs),
  - live room + member snapshot subscriptions.
- Dedicated room store (`useRoomStore`) for room session, members, ownership, and location sharing state.
- Foreground-only live location sharing with Expo Location:
  - auto attempt on create/join,
  - toggle sharing on/off,
  - pause in background and resume on foreground.
- Single-map room overlays:
  - room member markers on same SDK map instance,
  - stale/non-sharing members hidden,
  - current user marker hidden (SDK blue dot used),
  - identity marker payload includes avatar attempt with initials/text fallback.
- Navigation/session stability hardening:
  - readiness-safe native nav reset helpers,
  - startup cleanup + resume reconciliation,
  - single app-store nav end transition used across map/nav/room actions.
- Rounded toast feedback system for room + navigation flows:
  - success/error/info variants,
  - global toast host mounted in app root,
  - native `Alert` kept for destructive confirmations.
- Room-scoped chat for MVP:
  - realtime message stream from `rooms/{roomCode}/messages`,
  - text messaging and place-share messages,
  - latest 100 message history window,
  - `Share to Chat` from Place tab sends instantly and opens Chat tab.

## Known Limitations (Expected for MVP)
- Location sharing is foreground-only (no background task manager yet).
- No cold-start auto-rejoin of rooms.
- Member liveness is heartbeat/staleness based; no server-side disconnect hooks.
- Avatar map marker rendering depends on SDK/device support for custom marker icon payloads.
- Chat is MVP-only: no pagination, edit/delete/reply/read receipts, or push notifications.
- Firestore rules are mandatory for owner leave/end operations; publish [`mobile/firestore.rules`](/Users/saerukul/projects/coordnav/mobile/firestore.rules) in Firebase Console.

## Next TODOs
- Chat pagination/infinite scroll for older history.
- Chat delivery/read status and optional typing indicators.
- Chat moderation controls (delete/report) and richer place cards/deeplinks.
- Background location sharing with explicit user controls and battery safeguards.
- Server-side stale-member cleanup strategy and optional TTL enforcement.
- Enhanced marker visuals if/when SDK supports reliable custom marker views/icons.
- Room deep-link/join flow (`roomCode` links) and optional recent-room history.
