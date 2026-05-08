import { useCallback, useMemo, type ReactNode } from "react";
import type { Database } from "firebase/database";
import {
  createPlayableBattleCache,
  PlayableBattleCacheProvider,
} from "../components/playable-battle-cache";
import type { QuestContent } from "../data/quest-content";
import { writeRoomUpdate } from "../multiplayer/room-service";
import {
  buildQuestFieldUpdate,
  metadataUpdatedAtPath,
  questStatePath,
  type FirebaseUpdateMap,
} from "../multiplayer/room-paths";
import type { RoomSession } from "../multiplayer/room-types";
import type { DreamcallerContent } from "../types/content";
import type {
  CardSourceDebugState,
  DreamAtlas,
  Dreamsign,
  QuestFailureSummary,
  QuestState,
  Screen,
  TransfigurationType,
} from "../types/quest";
import type { DraftState } from "../types/draft";
import {
  applyCardSourceDebug,
  applyDraftState,
  applyDreamcallerSelection,
  applyRemainingDreamsignPool,
  createDefaultState,
  QuestContextProvider,
  type QuestMutations,
  type QuestContextValue,
} from "./quest-context";
import {
  changeQuestEssence,
  completeQuestSite,
  setQuestScreen,
  startQuestFromDreamcaller,
  updateQuestAtlas,
} from "./quest-state-actions";

const MAX_DREAMSIGNS = 12;

export interface MultiplayerQuestProviderProps {
  children: ReactNode;
  database: Database;
  session: RoomSession;
  questContent: QuestContent;
}

function writeUpdate(
  database: Database,
  updateMap: FirebaseUpdateMap,
): void {
  void writeRoomUpdate(database, updateMap);
}

function writeQuestField<K extends keyof QuestState>({
  database,
  roomId,
  field,
  value,
}: {
  database: Database;
  roomId: string;
  field: K;
  value: QuestState[K];
}): void {
  writeUpdate(
    database,
    buildQuestFieldUpdate(roomId, field, value, new Date().toISOString()),
  );
}

function writeWholeQuestState({
  database,
  roomId,
  state,
}: {
  database: Database;
  roomId: string;
  state: QuestState;
}): void {
  const updatedAt = new Date().toISOString();
  writeUpdate(database, {
    [questStatePath(roomId)]: state,
    [metadataUpdatedAtPath(roomId)]: updatedAt,
  });
}

function writeScreenUpdate({
  database,
  roomId,
  state,
}: {
  database: Database;
  roomId: string;
  state: QuestState;
}): void {
  const updatedAt = new Date().toISOString();
  writeUpdate(database, {
    ...buildQuestFieldUpdate(roomId, "screen", state.screen, updatedAt),
    ...buildQuestFieldUpdate(
      roomId,
      "activeSiteId",
      state.activeSiteId,
      updatedAt,
    ),
  });
}

export function MultiplayerQuestProvider({
  children,
  database,
  session,
  questContent,
}: MultiplayerQuestProviderProps) {
  const state = session.room.questState ?? createDefaultState();
  const roomId = session.roomId;
  const playableBattleCache = useMemo(() => createPlayableBattleCache(), []);

  const changeEssence = useCallback(
    (delta: number, _source: string) => {
      const next = changeQuestEssence(state, delta);
      writeQuestField({
        database,
        roomId,
        field: "essence",
        value: next.essence,
      });
    },
    [database, roomId, state],
  );

  const startQuest = useCallback(
    (dreamcaller: DreamcallerContent) => {
      const next = startQuestFromDreamcaller({
        prev: state,
        dreamcaller,
        questContent,
      });
      writeWholeQuestState({ database, roomId, state: next });
    },
    [database, questContent, roomId, state],
  );

  const setScreen = useCallback(
    (screen: Screen) => {
      writeScreenUpdate({
        database,
        roomId,
        state: setQuestScreen(state, screen),
      });
    },
    [database, roomId, state],
  );

  const setCardSourceDebug = useCallback(
    (cardSourceDebug: CardSourceDebugState | null, _source: string) => {
      const next = applyCardSourceDebug(state, cardSourceDebug);
      writeQuestField({
        database,
        roomId,
        field: "cardSourceDebug",
        value: next.cardSourceDebug,
      });
    },
    [database, roomId, state],
  );

  const addDreamsign = useCallback(
    (dreamsign: Dreamsign, _sourceSiteType: string) => {
      if (state.dreamsigns.length >= MAX_DREAMSIGNS) {
        return;
      }
      writeQuestField({
        database,
        roomId,
        field: "dreamsigns",
        value: [...state.dreamsigns, dreamsign],
      });
    },
    [database, roomId, state],
  );

  const removeDreamsign = useCallback(
    (index: number, _reason: string) => {
      if (state.dreamsigns[index] === undefined) {
        return;
      }
      writeQuestField({
        database,
        roomId,
        field: "dreamsigns",
        value: state.dreamsigns.filter((_, dreamsignIndex) => dreamsignIndex !== index),
      });
    },
    [database, roomId, state],
  );

  const setRemainingDreamsignPool = useCallback(
    (remainingDreamsignPool: string[], _source: string) => {
      const next = applyRemainingDreamsignPool(state, remainingDreamsignPool);
      writeQuestField({
        database,
        roomId,
        field: "remainingDreamsignPool",
        value: next.remainingDreamsignPool,
      });
    },
    [database, roomId, state],
  );

  const setCurrentDreamscape = useCallback(
    (nodeId: string | null) => {
      const next = {
        ...state,
        currentDreamscape: nodeId,
        visitedSites: nodeId !== null ? [] : state.visitedSites,
      };
      const updatedAt = new Date().toISOString();
      writeUpdate(database, {
        ...buildQuestFieldUpdate(
          roomId,
          "currentDreamscape",
          next.currentDreamscape,
          updatedAt,
        ),
        ...buildQuestFieldUpdate(
          roomId,
          "visitedSites",
          next.visitedSites,
          updatedAt,
        ),
      });
    },
    [database, roomId, state],
  );

  const updateAtlas = useCallback(
    (atlas: DreamAtlas) => {
      const next = updateQuestAtlas(state, atlas);
      writeQuestField({
        database,
        roomId,
        field: "atlas",
        value: next.atlas,
      });
    },
    [database, roomId, state],
  );

  const setDraftState = useCallback(
    (draftState: DraftState, _source: string) => {
      const next = applyDraftState(state, draftState);
      writeQuestField({
        database,
        roomId,
        field: "draftState",
        value: next.draftState,
      });
    },
    [database, roomId, state],
  );

  const setFailureSummary = useCallback(
    (failureSummary: QuestFailureSummary | null, _source: string) => {
      writeQuestField({
        database,
        roomId,
        field: "failureSummary",
        value: failureSummary === null ? null : { ...failureSummary },
      });
    },
    [database, roomId],
  );

  const resetQuest = useCallback(() => {
    writeWholeQuestState({
      database,
      roomId,
      state: createDefaultState(),
    });
  }, [database, roomId]);

  const setDreamcallerSelection = useCallback(
    (resolvedPackage: Parameters<QuestMutations["setDreamcallerSelection"]>[0]) => {
      const next = applyDreamcallerSelection(state, resolvedPackage);
      const updatedAt = new Date().toISOString();
      writeUpdate(database, {
        ...buildQuestFieldUpdate(
          roomId,
          "dreamcaller",
          next.dreamcaller,
          updatedAt,
        ),
        ...buildQuestFieldUpdate(
          roomId,
          "resolvedPackage",
          next.resolvedPackage,
          updatedAt,
        ),
        ...buildQuestFieldUpdate(
          roomId,
          "remainingDreamsignPool",
          next.remainingDreamsignPool,
          updatedAt,
        ),
      });
    },
    [database, roomId, state],
  );

  const completeSite = useCallback(
    (siteId: string, _source: string) => {
      const next = setQuestScreen(completeQuestSite(state, siteId), {
        type: "dreamscape",
      });
      const updatedAt = new Date().toISOString();
      writeUpdate(database, {
        ...buildQuestFieldUpdate(roomId, "visitedSites", next.visitedSites, updatedAt),
        ...buildQuestFieldUpdate(roomId, "atlas", next.atlas, updatedAt),
        ...buildQuestFieldUpdate(roomId, "screen", next.screen, updatedAt),
        ...buildQuestFieldUpdate(
          roomId,
          "activeSiteId",
          next.activeSiteId,
          updatedAt,
        ),
      });
    },
    [database, roomId, state],
  );

  const pickDraftCard = useCallback((_siteId: string, _cardNumber: number) => {
    throw new Error("pickDraftCard is not implemented for multiplayer yet");
  }, []);

  const mutations = useMemo<QuestMutations>(
    () => ({
      changeEssence,
      startQuest,
      completeSite,
      pickDraftCard,
      addCard: (_cardNumber: number, _source: string) => undefined,
      addBaneCard: (_cardNumber: number, _source: string) => undefined,
      removeCard: (_entryId: string, _source: string) => undefined,
      transfigureCard: (
        _entryId: string,
        _type: TransfigurationType,
        _effectDescription: string,
        _effectDetails: Record<string, unknown>,
      ) => undefined,
      setDreamcallerSelection,
      setCardSourceDebug,
      addDreamsign,
      removeDreamsign,
      setRemainingDreamsignPool,
      incrementCompletionLevel: (
        _essenceReward: number,
        _rewardCardNumber: number | null,
        _rewardCardName: string | null,
        _isMiniboss: boolean,
      ) => undefined,
      setScreen,
      markSiteVisited: (_siteId: string) => undefined,
      setCurrentDreamscape,
      updateAtlas,
      setDraftState,
      setFailureSummary,
      resetQuest,
    }),
    [
      changeEssence,
      startQuest,
      completeSite,
      pickDraftCard,
      setDreamcallerSelection,
      setCardSourceDebug,
      addDreamsign,
      removeDreamsign,
      setRemainingDreamsignPool,
      setScreen,
      setCurrentDreamscape,
      updateAtlas,
      setDraftState,
      setFailureSummary,
      resetQuest,
    ],
  );

  const value = useMemo<QuestContextValue>(
    () => ({
      state,
      mutations,
      cardDatabase: questContent.cardDatabase,
      questContent,
    }),
    [mutations, questContent, state],
  );

  return (
    <QuestContextProvider value={value}>
      <PlayableBattleCacheProvider cache={playableBattleCache}>
        {children}
      </PlayableBattleCacheProvider>
    </QuestContextProvider>
  );
}
