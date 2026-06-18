export type Member = {
  id: string;
  name: string | null;
  picture: string | null;
  joinedAt: string;
};

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}