# Firestore Rules Setup (Room + Chat MVP)

Use [firestore.rules](/Users/saerukul/projects/coordnav/mobile/firestore.rules) in Firebase Console:

1. Firebase Console -> Firestore Database -> Rules.
2. Replace existing rules with the contents of `mobile/firestore.rules`.
3. Publish rules.

## Why this update is required
- Fixes owner `leaveRoom` / `endRoom` permission issues.
- Allows room members to create/read room chat messages.
- Keeps message edits/deletes disabled for MVP.
- Handles batched owner cleanup safely (member deletes are allowed when owner is deleting the room in the same request).

## Notes
- These rules assume Google-auth users (`request.auth != null`).
- Join flow reads room by code before member doc exists, so room read is authenticated-only.
- If you later add stricter visibility, add a callable backend join token flow first.
