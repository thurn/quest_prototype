const ROOM_ID_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";
const DEFAULT_ROOM_ID_LENGTH = 6;
const ROOM_ID_PATTERN = /^[a-z0-9]{4,24}$/;

export type RandomBytes = (length: number) => Uint8Array;

function defaultRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateRoomId(
  randomBytes: RandomBytes = defaultRandomBytes,
  length = DEFAULT_ROOM_ID_LENGTH,
): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => ROOM_ID_ALPHABET[byte % ROOM_ID_ALPHABET.length]).join("");
}

export function isValidRoomId(roomId: string): boolean {
  return ROOM_ID_PATTERN.test(roomId);
}

export function normalizeRoomId(roomId: string | null): string | null {
  if (roomId === null) {
    return null;
  }

  const normalized = roomId.trim().toLowerCase();
  return isValidRoomId(normalized) ? normalized : null;
}
