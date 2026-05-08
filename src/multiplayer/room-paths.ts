import type { QuestState } from "../types/quest";

export type FirebaseUpdateMap = Record<string, unknown>;

export function roomPath(roomId: string): string {
  return `rooms/${roomId}`;
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
  return `${roomPath(roomId)}/presence/${clientId}`;
}

export function actionLogPath(roomId: string, actionId: string): string {
  return `${roomPath(roomId)}/actionLog/${actionId}`;
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
