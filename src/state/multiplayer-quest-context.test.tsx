// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import type { Database } from "firebase/database";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuestContent } from "../data/quest-content";
import type { RoomSession } from "../multiplayer/room-types";
import type { QuestState } from "../types/quest";
import { useQuest } from "./quest-context";
import { createDefaultState } from "./quest-context";
import { MultiplayerQuestProvider } from "./multiplayer-quest-context";

const roomServiceMocks = vi.hoisted(() => ({
  writeRoomUpdate: vi.fn(),
}));

vi.mock("../multiplayer/room-service", () => ({
  writeRoomUpdate: roomServiceMocks.writeRoomUpdate,
}));

const database = { app: { name: "test-app" } } as Database;
const roots: Root[] = [];

function mount(element: ReactElement): HTMLDivElement {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(element);
  });

  return container;
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
    const container = mount(
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
    const container = mount(
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
});
