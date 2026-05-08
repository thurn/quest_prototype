// @vitest-environment jsdom

import { act, type ReactElement, type ReactNode } from "react";
import type { Database } from "firebase/database";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuestContent } from "../data/quest-content";
import type { RoomSession } from "../multiplayer/room-types";
import type { QuestState } from "../types/quest";
import { useQuest, type QuestContextValue } from "./quest-context";
import { createDefaultState } from "./quest-context";
import { MultiplayerQuestProvider } from "./multiplayer-quest-context";

const roomServiceMocks = vi.hoisted(() => ({
  writeRoomUpdate: vi.fn(),
}));

const playableBattleCacheMocks = vi.hoisted(() => ({
  reset: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
}));

const bridgeMocks = vi.hoisted(() => ({
  resetBattleCompletionBridge: vi.fn(),
}));

const loggingMocks = vi.hoisted(() => ({
  resetLog: vi.fn(),
}));

vi.mock("../multiplayer/room-service", () => ({
  writeRoomUpdate: roomServiceMocks.writeRoomUpdate,
}));

vi.mock("../components/playable-battle-cache", () => ({
  createPlayableBattleCache: vi.fn(() => playableBattleCacheMocks),
  PlayableBattleCacheProvider: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../battle/integration/battle-completion-bridge", () => ({
  resetBattleCompletionBridge: bridgeMocks.resetBattleCompletionBridge,
}));

vi.mock("../logging", () => ({
  resetLog: loggingMocks.resetLog,
}));

const database = { app: { name: "test-app" } } as Database;
const roots: Root[] = [];

function mount(element: ReactElement): {
  container: HTMLDivElement;
  root: Root;
} {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(element);
  });

  return { container, root };
}

function makeQuestContent(): QuestContent {
  return {
    cardDatabase: new Map(),
    cardsByPackageTide: new Map(),
    dreamcallers: [],
    dreamsignTemplates: [],
    resolvedPackagesByDreamcallerId: new Map(),
  };
}

function makeSession(questState: QuestState | null): RoomSession {
  return {
    roomId: "ab12cd",
    clientId: "client-1",
    room: {
      metadata: {
        schemaVersion: 1,
        createdAt: "2026-05-08T12:00:00.000Z",
        updatedAt: "2026-05-08T12:00:00.000Z",
      },
      questState,
      presence: {},
      actionLog: {},
    },
  };
}

function Probe() {
  const quest = useQuest();

  return (
    <button
      type="button"
      onClick={() => {
        quest.mutations.changeEssence(25, "test");
      }}
    >
      {quest.state.essence}
    </button>
  );
}

function CaptureQuest({
  onQuest,
}: {
  onQuest: (quest: QuestContextValue) => void;
}) {
  const quest = useQuest();
  onQuest(quest);

  return <span>{quest.state.essence}</span>;
}

describe("MultiplayerQuestProvider", () => {
  beforeEach(() => {
    roomServiceMocks.writeRoomUpdate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    for (const root of roots.splice(0)) {
      act(() => {
        root.unmount();
      });
    }
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("provides subscribed quest state from the room session", () => {
    const questState = { ...createDefaultState(), essence: 300 };
    const { container } = mount(
      <MultiplayerQuestProvider
        database={database}
        session={makeSession(questState)}
        questContent={makeQuestContent()}
      >
        <Probe />
      </MultiplayerQuestProvider>,
    );

    expect(container.textContent).toBe("300");
  });

  it("writes a focused essence update", () => {
    const questState = { ...createDefaultState(), essence: 300 };
    const { container } = mount(
      <MultiplayerQuestProvider
        database={database}
        session={makeSession(questState)}
        questContent={makeQuestContent()}
      >
        <Probe />
      </MultiplayerQuestProvider>,
    );

    act(() => {
      container.querySelector("button")?.click();
    });

    expect(roomServiceMocks.writeRoomUpdate).toHaveBeenCalledTimes(1);
    expect(roomServiceMocks.writeRoomUpdate).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        "rooms/ab12cd/questState/essence": 325,
      }),
    );
  });

  it("throws for unsupported mutations without writing to Firebase", () => {
    const captured: QuestContextValue[] = [];
    mount(
      <MultiplayerQuestProvider
        database={database}
        session={makeSession(createDefaultState())}
        questContent={makeQuestContent()}
      >
        <CaptureQuest onQuest={(quest) => captured.push(quest)} />
      </MultiplayerQuestProvider>,
    );

    expect(() => {
      captured[captured.length - 1]?.mutations.addCard(1, "test");
    }).toThrow(
      "addCard is not available in multiplayer until its composed Firebase action is implemented",
    );
    expect(roomServiceMocks.writeRoomUpdate).not.toHaveBeenCalled();
  });

  it("keeps mutation identity stable across subscribed state snapshots", () => {
    const questContent = makeQuestContent();
    const captured: QuestContextValue[] = [];
    const { container, root } = mount(
      <MultiplayerQuestProvider
        database={database}
        session={makeSession({ ...createDefaultState(), essence: 300 })}
        questContent={questContent}
      >
        <CaptureQuest onQuest={(quest) => captured.push(quest)} />
      </MultiplayerQuestProvider>,
    );
    const initialMutations = captured[captured.length - 1]?.mutations;

    act(() => {
      root.render(
        <MultiplayerQuestProvider
          database={database}
          session={makeSession({ ...createDefaultState(), essence: 350 })}
          questContent={questContent}
        >
          <CaptureQuest onQuest={(quest) => captured.push(quest)} />
        </MultiplayerQuestProvider>,
      );
    });

    expect(container.textContent).toBe("350");
    expect(captured[captured.length - 1]?.mutations).toBe(initialMutations);
  });

  it("handles rejected Firebase writes", async () => {
    const error = new Error("write failed");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    roomServiceMocks.writeRoomUpdate.mockRejectedValueOnce(error);
    const { container } = mount(
      <MultiplayerQuestProvider
        database={database}
        session={makeSession({ ...createDefaultState(), essence: 300 })}
        questContent={makeQuestContent()}
      >
        <Probe />
      </MultiplayerQuestProvider>,
    );

    act(() => {
      container.querySelector("button")?.click();
    });
    await Promise.resolve();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to write multiplayer quest update",
      error,
    );

    consoleErrorSpy.mockRestore();
  });

  it("resets local runtime state when resetting the quest", () => {
    const captured: QuestContextValue[] = [];
    mount(
      <MultiplayerQuestProvider
        database={database}
        session={makeSession({ ...createDefaultState(), essence: 300 })}
        questContent={makeQuestContent()}
      >
        <CaptureQuest onQuest={(quest) => captured.push(quest)} />
      </MultiplayerQuestProvider>,
    );

    captured[captured.length - 1]?.mutations.resetQuest();

    expect(loggingMocks.resetLog).toHaveBeenCalledTimes(1);
    expect(bridgeMocks.resetBattleCompletionBridge).toHaveBeenCalledTimes(1);
    expect(playableBattleCacheMocks.reset).toHaveBeenCalledTimes(1);
    expect(roomServiceMocks.writeRoomUpdate).toHaveBeenCalledWith(
      database,
      expect.objectContaining({
        "rooms/ab12cd/questState": createDefaultState(),
      }),
    );
  });
});
