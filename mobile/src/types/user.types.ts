// src/types/user.types.ts
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