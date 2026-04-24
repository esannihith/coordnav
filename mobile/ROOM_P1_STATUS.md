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

## Known Limitations (Expected for MVP)
- Chat is out of scope for this phase.
- Location sharing is foreground-only (no background task manager yet).
- No cold-start auto-rejoin of rooms.
- Member liveness is heartbeat/staleness based; no server-side disconnect hooks.
- Avatar map marker rendering depends on SDK/device support for custom marker icon payloads.

## Next TODOs
- Chat domain + tab implementation with room-scoped messages.
- Background location sharing with explicit user controls and battery safeguards.
- Server-side stale-member cleanup strategy and optional TTL enforcement.
- Enhanced marker visuals if/when SDK supports reliable custom marker views/icons.
- Room deep-link/join flow (`roomCode` links) and optional recent-room history.
