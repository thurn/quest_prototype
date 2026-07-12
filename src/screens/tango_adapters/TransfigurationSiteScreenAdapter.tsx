import { useCallback, useEffect, useMemo } from "react";
import { logEvent, logEventOnce } from "../../logging";
import { useQuest } from "../../state/quest-context";
import { TransfigurationSiteScreen, type TransfigurationFormView } from "../../tango/screens/TransfigurationSiteScreen";
import { buildTransfigurationSiteView } from "./transfiguration-view-model";

export function TransfigurationSiteScreenAdapter({ siteId, onViewDeck }: { siteId: string; onViewDeck?: () => void }) {
  const { state, mutations, questContent } = useQuest();
  const node = state.currentDreamscape === null ? null : (state.atlas.nodes[state.currentDreamscape] ?? null);
  const site = node?.sites.find((candidate) => candidate.id === siteId) ?? null;
  const storedRuntime = state.siteRuntime[siteId];
  const runtime = storedRuntime?.kind === "cardChoice" && storedRuntime.choiceKind === "transfiguration" ? storedRuntime : null;
  const view = useMemo(() => site === null || runtime === null ? null : buildTransfigurationSiteView({ state, sceneNode: node, site, runtime, cardDatabase: questContent.cardDatabase }), [state, node, site, runtime, questContent.cardDatabase]);

  useEffect(() => { if (site !== null && storedRuntime === undefined) mutations.ensureCardChoiceRuntime(site.id, "transfiguration"); }, [mutations, site, storedRuntime]);
  useEffect(() => { if (site !== null) logEventOnce(`transfiguration:${site.id}:site-entered`, "site_entered", { siteType: site.type, isEnhanced: site.isEnhanced, deckSize: state.deck.length, ui: "tango" }); }, [site, state.deck.length]);

  const handleLeaveEmpty = useCallback(() => { if (site === null) return; logEvent("site_completed", { siteType: "Transfiguration", outcome: "no_candidates", ui: "tango" }); mutations.completeSite(site.id, "transfiguration_no_candidates"); }, [mutations, site]);
  const handleConfirm = useCallback((entryId: string, form: TransfigurationFormView) => { if (site === null) return; logEvent("transfiguration_completed", { siteId: site.id, entryId, transfigurationType: form.type, effectDescription: form.effectDescription, effectDetails: form.effectDetails, essenceCost: form.essenceCost, essenceBefore: state.essence, essenceAfter: Math.max(0, state.essence - form.essenceCost), isEnhanced: site.isEnhanced, currentDreamscape: state.currentDreamscape, completionLevel: state.completionLevel, ui: "tango" }); mutations.acceptTransfigurationChoice(site.id, entryId, form.type, form.effectDescription, form.effectDetails); }, [mutations, site, state]);

  if (site === null || view === null || site.isEnhanced) return null;
  return <TransfigurationSiteScreen view={view} onLeaveEmpty={handleLeaveEmpty} onConfirm={handleConfirm} onViewDeck={onViewDeck} />;
}
