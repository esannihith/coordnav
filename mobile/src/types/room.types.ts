export type Member = {
  id: string;
  name: string | null;
  picture: string | null;
  joinedAt: string;
};

export interface Destination {
  placeId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  destination: Destination | null;
}