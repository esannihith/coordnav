// Mirrors the server's canonical ChatMessage payload (REST history + socket
// chat:new), plus client-only optimistic fields.
export interface PlaceSnapshot {
  placeId: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

export interface MessageSender {
  id: string;
  name: string | null;
  picture: string | null;
}

export type MessageStatus = "sending" | "sent" | "failed";

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: MessageSender;
  kind: "TEXT" | "PLACE";
  text?: string;
  place?: PlaceSnapshot;
  createdAt: string;

  // Client-only: set on optimistic sends and echoed back by the server so the
  // optimistic bubble can be reconciled with the authoritative row.
  clientId?: string;
  status?: MessageStatus;
}
