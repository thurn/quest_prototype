import type { Database } from "firebase/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MultiplayerRoom } from "./room-types";
import {
  createRoom,
  createRoomRecord,
  runRoomTransaction,
  subscribeToRoom,
  writePresence,
  writeRoomUpdate,
} from "./room-service";

type SnapshotStub = {
  exists: () => boolean;
  val: () => unknown;
};
type SnapshotListener = (snapshot: SnapshotStub) => void;
type ErrorListener = (error: Error) => void;
type TransactionUpdater = (current: unknown) => unknown;

const firebaseMocks = vi.hoisted(() => {
  const remove = vi.fn();

  return {
    onDisconnect: vi.fn(() => ({ remove })),
    onValue: vi.fn(),
    ref: vi.fn((database: Database, path?: string) => ({ database, path })),
    remove,
    runTransaction: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  };
});

vi.mock("firebase/database", () => ({
  onDisconnect: firebaseMocks.onDisconnect,
  onValue: firebaseMocks.onValue,
  ref: firebaseMocks.ref,
  runTransaction: firebaseMocks.runTransaction,
  set: firebaseMocks.set,
  update: firebaseMocks.update,
}));

const database = { app: { name: "test-app" } } as Database;
const timestamp = "2026-05-08T12:00:00.000Z";

describe("room service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firebaseMocks.remove.mockResolvedValue(undefined);
    firebaseMocks.runTransaction.mockResolvedValue({ committed: true, snapshot: null });
    firebaseMocks.set.mockResolvedValue(undefined);
    firebaseMocks.update.mockResolvedValue(undefined);
  });

  it("builds an empty room record with schema metadata", () => {
    expect(createRoomRecord(timestamp)).toEqual({
      metadata: {
        schemaVersion: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      questState: null,
      presence: {},
      actionLog: {},
    });
  });

  it("creates a room at the room path", async () => {
    await createRoom(database, "ab12", timestamp);

    expect(firebaseMocks.ref).toHaveBeenCalledWith(database, "rooms/ab12");
    expect(firebaseMocks.set).toHaveBeenCalledWith(
      { database, path: "rooms/ab12" },
      createRoomRecord(timestamp),
    );
  });

  it("subscribes to room snapshots and emits ready records", () => {
    const listener = vi.fn();
    const unsubscribe = vi.fn();
    const room = createRoomRecord(timestamp);
    firebaseMocks.onValue.mockImplementation((_entryRef, next: SnapshotListener) => {
      next({ exists: () => true, val: () => room });
      return unsubscribe;
    });

    expect(subscribeToRoom(database, "ab12", listener)).toBe(unsubscribe);

    expect(firebaseMocks.ref).toHaveBeenCalledWith(database, "rooms/ab12");
    expect(listener).toHaveBeenCalledWith({ status: "ready", room });
  });

  it("emits missing when the room snapshot does not exist", () => {
    const listener = vi.fn();
    firebaseMocks.onValue.mockImplementation((_entryRef, next: SnapshotListener) => {
      next({ exists: () => false, val: () => null });
      return vi.fn();
    });

    subscribeToRoom(database, "ab12", listener);

    expect(listener).toHaveBeenCalledWith({ status: "missing" });
  });

  it("emits Firebase subscription errors", () => {
    const listener = vi.fn();
    firebaseMocks.onValue.mockImplementation(
      (_entryRef, _next: SnapshotListener, error: ErrorListener) => {
        error(new Error("permission denied"));
        return vi.fn();
      },
    );

    subscribeToRoom(database, "ab12", listener);

    expect(listener).toHaveBeenCalledWith({ status: "error", message: "permission denied" });
  });

  it("writes connected presence and registers disconnect cleanup", async () => {
    await writePresence(database, "ab12", "client-1", timestamp);

    expect(firebaseMocks.ref).toHaveBeenCalledWith(database, "rooms/ab12/presence/client-1");
    expect(firebaseMocks.set).toHaveBeenCalledWith(
      { database, path: "rooms/ab12/presence/client-1" },
      { connected: true, lastSeenAt: timestamp },
    );
    expect(firebaseMocks.onDisconnect).toHaveBeenCalledWith({
      database,
      path: "rooms/ab12/presence/client-1",
    });
    expect(firebaseMocks.remove).toHaveBeenCalledOnce();
  });

  it("runs room transactions and preserves current data when updater returns undefined", async () => {
    const current = createRoomRecord(timestamp);
    const updater = vi.fn(() => undefined);
    firebaseMocks.runTransaction.mockImplementation(
      async (_entryRef, transactionUpdater: TransactionUpdater) => {
        expect(transactionUpdater(current)).toBe(current);
      },
    );

    await runRoomTransaction(database, "ab12", updater);

    expect(firebaseMocks.ref).toHaveBeenCalledWith(database, "rooms/ab12");
    expect(updater).toHaveBeenCalledWith(current);
  });

  it("writes focused updates from the root", async () => {
    const updateMap = {
      "rooms/ab12/metadata/updatedAt": timestamp,
    };

    await writeRoomUpdate(database, updateMap);

    expect(firebaseMocks.ref).toHaveBeenCalledWith(database);
    expect(firebaseMocks.update).toHaveBeenCalledWith({ database, path: undefined }, updateMap);
  });

  it("allows transaction updaters to write null", async () => {
    const current: MultiplayerRoom = createRoomRecord(timestamp);
    firebaseMocks.runTransaction.mockImplementation(
      async (_entryRef, transactionUpdater: TransactionUpdater) => {
        expect(transactionUpdater(current)).toBeNull();
      },
    );

    await runRoomTransaction(database, "ab12", () => null);
  });
});
