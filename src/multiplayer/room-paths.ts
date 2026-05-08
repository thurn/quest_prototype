import type { QuestState } from "../types/quest";

const FIREBASE_FORBIDDEN_KEY_CHARS = /[.#$[\]/\u0000-\u001F\u007F]/u;
const MAX_FIREBASE_KEY_BYTES = 768;

export type FirebaseUpdateMap = Record<string, unknown>;

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function assertFirebasePathSegment(segment: string, label: string): string {
  if (
    segment === "" ||
    FIREBASE_FORBIDDEN_KEY_CHARS.test(segment) ||
    utf8ByteLength(segment) > MAX_FIREBASE_KEY_BYTES
  ) {
    throw new Error(`${label} must be a non-empty Firebase path segment.`);
  }
  return segment;
}

export function roomPath(roomId: string): string {
  return `rooms/${assertFirebasePathSegment(roomId, "roomId")}`;
}

export function questStatePath(roomId: string): string {
  return `${roomPath(roomId)}/questState`;
}

export function questStateFieldPath<K extends keyof QuestState>(
  roomId: string,
  field: K,
): string {
  return `${questStatePath(roomId)}/${String(field)}`;
}

export function metadataUpdatedAtPath(roomId: string): string {
  return `${roomPath(roomId)}/metadata/updatedAt`;
}

export function presencePath(roomId: string, clientId: string): string {
  return `${roomPath(roomId)}/presence/${assertFirebasePathSegment(clientId, "clientId")}`;
}

export function actionLogPath(roomId: string, actionId: string): string {
  return `${roomPath(roomId)}/actionLog/${assertFirebasePathSegment(actionId, "actionId")}`;
}

export function buildQuestFieldUpdate<K extends keyof QuestState>(
  roomId: string,
  field: K,
  value: QuestState[K],
  updatedAt: string,
): FirebaseUpdateMap {
  return {
    [questStateFieldPath(roomId, field)]: value,
    [metadataUpdatedAtPath(roomId)]: updatedAt,
  };
}

export function buildMetadataUpdate(
  roomId: string,
  updatedAt: string,
): FirebaseUpdateMap {
  return {
    [metadataUpdatedAtPath(roomId)]: updatedAt,
  };
}
