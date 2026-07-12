import { describe, expect, it } from "vitest";
import { createDefaultState } from "../../state/quest-context";
import { asCardId, asCardName } from "../../types/card-identity";
import type { CardData } from "../../types/cards";
import type { CardChoiceSiteRuntime } from "../../types/quest";
import { buildTransfigurationCandidates } from "./transfiguration-view-model";

function card(cardNumber: number): CardData {
  return { id: asCardId(`card-${String(cardNumber)}`), name: asCardName("Fixture"), cardNumber, cardType: "Character", subtype: "", isStarter: false, energyCost: 2, spark: 2, isFast: false, renderedText: "", imageNumber: cardNumber, artOwned: true };
}

describe("buildTransfigurationCandidates", () => {
  it("groups flat offers by concrete deck-entry id and caps the standard offer at three cards", () => {
    const state = { ...createDefaultState(), deck: [1, 2, 3, 4].map((number) => ({ entryId: `entry-${String(number)}`, cardNumber: number, transfiguration: null, isBane: false })) };
    const runtime: CardChoiceSiteRuntime = {
      kind: "cardChoice",
      choiceKind: "transfiguration",
      entryIds: state.deck.map((entry) => entry.entryId),
      acceptedEntryIds: [],
      transfigurationOffers: state.deck.flatMap((entry) => ["Empowered", "Kindled"].map((type) => ({ entryId: entry.entryId, type: type as "Empowered" | "Kindled", effectDescription: `${type} effect`, effectDetails: {}, previewCard: card(entry.cardNumber), essenceCost: 20 }))),
    };
    const result = buildTransfigurationCandidates(state, runtime, new Map([1, 2, 3, 4].map((number) => [number, card(number)])));
    expect(result).toHaveLength(3);
    expect(result[0]?.entryId).toBe("entry-1");
    expect(result[0]?.forms.map((form) => form.type)).toEqual(["Empowered", "Kindled"]);
    expect(result[0]?.model.cardId).toBe("card-1");
  });

  it("excludes already-transfigured entries", () => {
    const state = { ...createDefaultState(), deck: [{ entryId: "entry-1", cardNumber: 1, transfiguration: "Empowered" as const, isBane: false }] };
    const runtime: CardChoiceSiteRuntime = { kind: "cardChoice", choiceKind: "transfiguration", entryIds: ["entry-1"], acceptedEntryIds: [], transfigurationOffers: [{ entryId: "entry-1", type: "Kindled", effectDescription: "Effect", effectDetails: {}, previewCard: card(1), essenceCost: 20 }] };
    expect(buildTransfigurationCandidates(state, runtime, new Map([[1, card(1)]]))).toEqual([]);
  });
});
