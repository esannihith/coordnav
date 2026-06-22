import { useCallback } from "react";
import { statusCodes } from "@react-native-google-signin/google-signin";
import { useAlertStore, useAuthStore, useRoomStore } from "@/store";
import { authService } from "@/services";
import { Member, Room } from "@/types/room.types";
import { RoomEntryResult } from "@/store/room.store";

type Conflict = { room: Room; members: Member[] };

/**
 * Shared Create/Join entry flow used by the Home and Create sheets.
 *
 * Flow: ensure auth (sign-in returns the current room state in one round-trip) →
 * if the user is already in a room, offer a non-destructive Rejoin or an explicit
 * "Leave & continue" → otherwise run the create/join action. A late 409
 * ALREADY_IN_ROOM (e.g. another device just created a room) is handled the same way.
 *
 * `continueAction` is the room-store action to (re)run, e.g. () => joinRoom(code).
 */
export function useRoomEntry() {
  const showAlert = useAlertStore((s) => s.showAlert);

  const promptConflict = useCallback(
    (conflict: Conflict, continueAction: () => Promise<RoomEntryResult>) => {
      showAlert(
        `You're already in "${conflict.room.name}"`,
        "Rejoin it, or leave that room and continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Rejoin",
            onPress: () =>
              useRoomStore
                .getState()
                .applyRoomSnapshot(conflict.room, conflict.members),
          },
          {
            text: "Leave & continue",
            style: "destructive",
            onPress: async () => {
              await useRoomStore.getState().leaveRoom();
              // Leave failed (error already surfaced in the store) — abort.
              if (useRoomStore.getState().room !== null) return;
              const result = await continueAction();
              if (result.alreadyInRoom) {
                useRoomStore.setState({
                  error: "Could not switch rooms. Please try again.",
                });
              }
            },
          },
        ],
      );
    },
    [showAlert],
  );

  return useCallback(
    async (continueAction: () => Promise<RoomEntryResult>) => {
      let conflict: Conflict | null = null;

      // 1. Ensure the user is authenticated.
      if (useAuthStore.getState().user === null) {
        let session;
        try {
          session = await authService.signInWithGoogle();
        } catch (err: any) {
          if (err && err.code !== statusCodes.SIGN_IN_CANCELLED) {
            showAlert(
              "Sign-In Failed",
              `Could not complete Google Sign-In: ${err.message || String(err)}`,
            );
          }
          return;
        }
        await useAuthStore.getState().setSession(session);
        if (session.room) {
          conflict = { room: session.room, members: session.members };
        } else {
          useRoomStore.getState().applyRoomSnapshot(null, []);
        }
      } else {
        const existing = useRoomStore.getState().room;
        if (existing) {
          conflict = {
            room: existing,
            members: useRoomStore.getState().members,
          };
        }
      }

      // 2. Already in a room → offer Rejoin / Leave & continue.
      if (conflict) {
        promptConflict(conflict, continueAction);
        return;
      }

      // 3. Otherwise create/join; handle a late cross-device conflict.
      const result = await continueAction();
      if (result.alreadyInRoom) {
        promptConflict(result.alreadyInRoom, continueAction);
      }
    },
    [showAlert, promptConflict],
  );
}
