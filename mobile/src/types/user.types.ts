// src/types/user.types.ts
import { Room, Member } from "./room.types";

export type User = {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export type Tokens = {
  accessToken: string;
  refreshToken: string;
}

export interface Session {
  user: User;
  tokens: Tokens;
}

// Sign-in bootstrap: identity + tokens + current room state in one round-trip.
export interface SignInResult extends Session {
  room: Room | null;
  members: Member[];
}