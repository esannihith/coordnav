import { getApp } from '@react-native-firebase/app';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  FirebaseFirestoreTypes,
  GeoPoint,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from '@react-native-firebase/firestore';

const ROOM_COLLECTION = 'rooms';
const MEMBER_SUBCOLLECTION = 'liveLocations';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const CREATE_ROOM_MAX_ATTEMPTS = 12;

const app = getApp();
const db = getFirestore(app);

export const ROOM_MEMBER_STALE_MS = 2 * 60 * 1000;

export type RoomServiceErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_INACTIVE'
  | 'ROOM_CODE_COLLISION'
  | 'ROOM_CODE_GENERATION_FAILED';

export class RoomServiceError extends Error {
  code: RoomServiceErrorCode;

  constructor(code: RoomServiceErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface RoomDoc {
  ownerUid: string;
  roomName: string;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
  isActive: boolean;
}

export interface MemberDoc {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  joinedAt: FirebaseFirestoreTypes.Timestamp | null;
  isSharing: boolean;
  location?: FirebaseFirestoreTypes.GeoPoint | null;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
}

export interface RoomMember {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  joinedAtMs: number | null;
  isSharing: boolean;
  location: { lat: number; lng: number } | null;
  updatedAtMs: number | null;
}

export interface RoomSnapshot {
  roomCode: string;
  roomName: string;
  ownerUid: string;
  isActive: boolean;
  createdAtMs: number | null;
}

interface RoomCreateResult {
  roomCode: string;
  roomName: string;
}

function roomRef(roomCode: string) {
  return doc(db, ROOM_COLLECTION, roomCode);
}

function memberRef(roomCode: string, uid: string) {
  return doc(db, ROOM_COLLECTION, roomCode, MEMBER_SUBCOLLECTION, uid);
}

function normalizeDisplayName(user: FirebaseAuthTypes.User): string {
  const trimmed = user.displayName?.trim();
  if (trimmed) return trimmed;

  const emailName = user.email?.split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'Anonymous';
}

export function normalizeRoomCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/[ILO01]/g, '')
    .slice(0, ROOM_CODE_LENGTH);
}

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET[index];
  }
  return code;
}

function toRoomSnapshot(roomCode: string, docData: FirebaseFirestoreTypes.DocumentData): RoomSnapshot {
  return {
    roomCode,
    roomName: (docData.roomName as string) || 'Room',
    ownerUid: docData.ownerUid as string,
    isActive: docData.isActive !== false,
    createdAtMs: docData.createdAt?.toMillis?.() ?? null,
  };
}

function toMemberSnapshot(snapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot): RoomMember {
  const data = snapshot.data() as MemberDoc;
  return {
    uid: snapshot.id,
    displayName: data.displayName || 'Member',
    photoURL: data.photoURL ?? null,
    joinedAtMs: data.joinedAt?.toMillis?.() ?? null,
    isSharing: Boolean(data.isSharing),
    location: data.location
      ? {
          lat: data.location.latitude,
          lng: data.location.longitude,
        }
      : null,
    updatedAtMs: data.updatedAt?.toMillis?.() ?? null,
  };
}

async function ensureRoomActive(roomCode: string): Promise<RoomSnapshot> {
  const snapshot = await getDoc(roomRef(roomCode));
  if (!snapshot.exists()) {
    throw new RoomServiceError('ROOM_NOT_FOUND', 'Room does not exist.');
  }

  const data = snapshot.data();
  if (!data || data.isActive === false) {
    throw new RoomServiceError('ROOM_INACTIVE', 'Room is inactive.');
  }

  return toRoomSnapshot(roomCode, data);
}

async function cleanupRoomIfEmpty(roomCode: string): Promise<void> {
  const membersQuery = query(
    collection(roomRef(roomCode), MEMBER_SUBCOLLECTION),
    limit(1)
  );
  const membersSnap = await getDocs(membersQuery);

  if (membersSnap.empty) {
    await deleteDoc(roomRef(roomCode));
  }
}

export const roomService = {
  async createRoom(user: FirebaseAuthTypes.User, roomNameInput: string): Promise<RoomCreateResult> {
    const roomName = roomNameInput.trim() || 'My Room';

    for (let attempt = 0; attempt < CREATE_ROOM_MAX_ATTEMPTS; attempt += 1) {
      const roomCode = generateRoomCode();
      const roomDocRef = roomRef(roomCode);
      const myMemberRef = memberRef(roomCode, user.uid);

      try {
        await runTransaction(db, async (transaction) => {
          const roomSnap = await transaction.get(roomDocRef);
          if (roomSnap.exists()) {
            throw new RoomServiceError('ROOM_CODE_COLLISION');
          }

          const now = serverTimestamp();

          transaction.set(roomDocRef, {
            ownerUid: user.uid,
            roomName,
            createdAt: now,
            isActive: true,
          });

          transaction.set(myMemberRef, {
            uid: user.uid,
            displayName: normalizeDisplayName(user),
            photoURL: user.photoURL ?? null,
            joinedAt: now,
            isSharing: false,
            location: null,
            updatedAt: null,
          });
        });

        return { roomCode, roomName };
      } catch (error) {
        if (error instanceof RoomServiceError && error.code === 'ROOM_CODE_COLLISION') {
          continue;
        }
        throw error;
      }
    }

    throw new RoomServiceError(
      'ROOM_CODE_GENERATION_FAILED',
      'Could not generate a unique room code. Please try again.'
    );
  },

  async joinRoom(roomCodeInput: string, user: FirebaseAuthTypes.User): Promise<RoomSnapshot> {
    const roomCode = normalizeRoomCode(roomCodeInput);
    if (roomCode.length !== ROOM_CODE_LENGTH) {
      throw new RoomServiceError('ROOM_NOT_FOUND', 'Invalid room code format.');
    }

    const room = await ensureRoomActive(roomCode);

    await setDoc(
      memberRef(roomCode, user.uid),
      {
        uid: user.uid,
        displayName: normalizeDisplayName(user),
        photoURL: user.photoURL ?? null,
        joinedAt: serverTimestamp(),
        isSharing: false,
        location: null,
        updatedAt: null,
      },
      { merge: true }
    );

    return room;
  },

  async leaveRoom(roomCodeInput: string, uid: string): Promise<void> {
    const roomCode = normalizeRoomCode(roomCodeInput);
    if (!roomCode) return;

    const roomDocRef = roomRef(roomCode);
    await deleteDoc(memberRef(roomCode, uid)).catch(() => undefined);

    const roomSnap = await getDoc(roomDocRef);
    if (!roomSnap.exists()) {
      return;
    }

    const roomData = roomSnap.data() as RoomDoc;

    // Owner handoff: oldest joined active member becomes next owner.
    if (roomData.ownerUid === uid) {
      const nextOwnerQuery = query(
        collection(roomDocRef, MEMBER_SUBCOLLECTION),
        orderBy('joinedAt', 'asc'),
        limit(1)
      );
      const nextOwnerSnap = await getDocs(nextOwnerQuery);

      if (!nextOwnerSnap.empty) {
        await updateDoc(roomDocRef, { ownerUid: nextOwnerSnap.docs[0].id });
      }
    }

    await cleanupRoomIfEmpty(roomCode);
  },

  async endRoom(roomCodeInput: string, ownerUid: string): Promise<void> {
    const roomCode = normalizeRoomCode(roomCodeInput);
    const roomDocRef = roomRef(roomCode);
    const roomSnap = await getDoc(roomDocRef);

    if (!roomSnap.exists()) {
      return;
    }

    const roomData = roomSnap.data() as RoomDoc;
    if (roomData.ownerUid !== ownerUid) {
      throw new Error('Only the room owner can end the room.');
    }

    const membersSnap = await getDocs(collection(roomDocRef, MEMBER_SUBCOLLECTION));
    const batch = writeBatch(db);

    membersSnap.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    batch.delete(roomDocRef);

    await batch.commit();
  },

  async setSharing(roomCodeInput: string, uid: string, isSharing: boolean): Promise<void> {
    const roomCode = normalizeRoomCode(roomCodeInput);
    if (!roomCode) return;

    await setDoc(
      memberRef(roomCode, uid),
      {
        isSharing,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async updateLiveLocation(roomCodeInput: string, uid: string, latitude: number, longitude: number): Promise<void> {
    const roomCode = normalizeRoomCode(roomCodeInput);
    if (!roomCode) return;

    await setDoc(
      memberRef(roomCode, uid),
      {
        isSharing: true,
        location: new GeoPoint(latitude, longitude),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  subscribeRoom(
    roomCodeInput: string,
    onChange: (room: RoomSnapshot | null) => void,
    onError?: (error: Error) => void
  ): () => void {
    const roomCode = normalizeRoomCode(roomCodeInput);

    return onSnapshot(
      roomRef(roomCode),
      (snapshot) => {
        if (!snapshot.exists()) {
          onChange(null);
          return;
        }

        const data = snapshot.data();
        if (!data || data.isActive === false) {
          onChange(null);
          return;
        }

        onChange(toRoomSnapshot(roomCode, data));
      },
      (error) => {
        onError?.(error as Error);
      }
    );
  },

  subscribeMembers(
    roomCodeInput: string,
    onChange: (members: RoomMember[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    const roomCode = normalizeRoomCode(roomCodeInput);

    const membersQuery = query(
      collection(roomRef(roomCode), MEMBER_SUBCOLLECTION),
      orderBy('joinedAt', 'asc')
    );

    return onSnapshot(
      membersQuery,
      (snapshot) => {
        const members = snapshot.docs.map(toMemberSnapshot);
        onChange(members);
      },
      (error) => {
        onError?.(error as Error);
      }
    );
  },
};

export function isMemberStale(member: RoomMember, nowMs = Date.now()): boolean {
  if (!member.updatedAtMs) return true;
  return nowMs - member.updatedAtMs > ROOM_MEMBER_STALE_MS;
}

export function formatRoomError(error: unknown): string {
  if (error instanceof RoomServiceError) {
    switch (error.code) {
      case 'ROOM_NOT_FOUND':
        return 'Room not found. Check the code and try again.';
      case 'ROOM_INACTIVE':
        return 'This room is no longer active.';
      case 'ROOM_CODE_GENERATION_FAILED':
        return 'Could not create a unique room code. Try again.';
      case 'ROOM_CODE_COLLISION':
        return 'Room code collision, retrying...';
      default:
        return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
