import { buildTransfigurationDisplay } from "../../transfiguration/transfiguration-logic";
import { TRANSFIGURATION_COLORS } from "../../runtime/transfiguration-display";
import type { CardData } from "../../types/cards";
import type { CardChoiceSiteRuntime, DreamscapeNode, QuestState, SiteState, TransfigurationType } from "../../types/quest";
import { GLYPHS, type Glyph } from "../../tango/primitives/glyph";
import type { TransfigurationCandidateView, TransfigurationSiteView } from "../../tango/screens/TransfigurationSiteScreen";
import { buildDreamscapeHudView, dreamscapeSceneRef } from "./dreamscape-view-model";

const FORM_GLYPHS: Record<TransfigurationType, Glyph> = {
  Empowered: GLYPHS.spark,
  Kindled: GLYPHS.bolt,
  Inspired: GLYPHS.sparkInline,
  Enduring: GLYPHS.refresh,
  Hastened: GLYPHS.chevronRight,
  Resonant: GLYPHS.spark,
  Amplified: GLYPHS.bolt,
  Attuned: GLYPHS.sparkInline,
  Perfected: GLYPHS.spark,
};

/** Group the persisted flat form offers into the three offered deck entries. */
export function buildTransfigurationCandidates(
  state: QuestState,
  runtime: CardChoiceSiteRuntime,
  cardDatabase: ReadonlyMap<number, CardData>,
): TransfigurationCandidateView[] {
  if (runtime.choiceKind !== "transfiguration") return [];
  const deckById = new Map(state.deck.map((entry) => [entry.entryId, entry]));
  const candidates = new Map<string, TransfigurationCandidateView>();
  for (const offer of runtime.transfigurationOffers) {
    const entry = deckById.get(offer.entryId);
    if (entry === undefined || entry.transfiguration !== null) continue;
    const card = cardDatabase.get(entry.cardNumber);
    if (card === undefined) continue;
    const preview = buildTransfigurationDisplay(card, offer.type);
    const existing = candidates.get(entry.entryId);
    const form = {
      type: offer.type,
      effectDescription: offer.effectDescription,
      effectDetails: offer.effectDetails,
      essenceCost: offer.essenceCost,
      accent: TRANSFIGURATION_COLORS[offer.type],
      glyph: FORM_GLYPHS[offer.type],
      previewModel: { cardId: preview.card.id, displaySnapshot: preview.card },
      previewDisplay: preview.display,
    };
    if (existing === undefined) {
      candidates.set(entry.entryId, {
        entryId: entry.entryId,
        model: { cardId: card.id, displaySnapshot: card },
        forms: [form],
      });
    } else {
      candidates.set(entry.entryId, { ...existing, forms: [...existing.forms, form] });
    }
  }
  return [...candidates.values()].slice(0, 3);
}

/** Build the complete desktop Tango transfiguration view. */
export function buildTransfigurationSiteView(params: {
  state: QuestState;
  sceneNode: DreamscapeNode | null;
  site: SiteState;
  runtime: CardChoiceSiteRuntime;
  cardDatabase: ReadonlyMap<number, CardData>;
}): TransfigurationSiteView {
  return {
    siteId: params.site.id,
    scene: params.sceneNode === null ? null : dreamscapeSceneRef(params.sceneNode),
    candidates: buildTransfigurationCandidates(params.state, params.runtime, params.cardDatabase),
    essence: params.state.essence,
    alreadyAccepted: params.runtime.acceptedEntryIds.length > 0,
    hud: buildDreamscapeHudView(params.state),
  };
}
