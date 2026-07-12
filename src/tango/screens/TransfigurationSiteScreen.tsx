import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { Button } from "../components/controls/Button";
import { IconButton } from "../components/controls/IconButton";
import { OptionListItem } from "../components/controls/OptionListItem";
import { GameCard, type GameCardModel } from "../components/card/CardView";
import { QuestStatusBar } from "../components/hud/QuestStatusBar";
import { Motes } from "../components/hud/Motes";
import type { CardTransfigurationDisplay } from "../../runtime/transfiguration-display";
import type { TransfigurationType } from "../../types/quest";
import type { ArtRef } from "../primitives/art";
import { resolveArtRef } from "../primitives/art";
import type { TangoColor } from "../primitives/color";
import { GLYPHS, type Glyph } from "../primitives/glyph";
import { glassSurfaceStyle } from "../internal/glass-surface";
import { token } from "../primitives/tokens";
import type { GuideGalleryHudView } from "./GuideGallerySiteLayout";

export interface TransfigurationFormView {
  type: TransfigurationType;
  effectDescription: string;
  effectDetails: Record<string, unknown>;
  essenceCost: number;
  accent: TangoColor;
  glyph: Glyph;
  previewModel: GameCardModel;
  previewDisplay: CardTransfigurationDisplay;
}

export interface TransfigurationCandidateView {
  entryId: string;
  model: GameCardModel;
  forms: readonly TransfigurationFormView[];
}

export interface TransfigurationSiteView {
  siteId: string;
  scene: ArtRef | null;
  candidates: readonly TransfigurationCandidateView[];
  essence: number;
  alreadyAccepted: boolean;
  hud: GuideGalleryHudView;
}

export interface TransfigurationSiteScreenProps {
  view: TransfigurationSiteView;
  onLeaveEmpty: () => void;
  onConfirm: (entryId: string, form: TransfigurationFormView) => void;
  onViewDeck?: () => void;
}

const PANEL_MAX_WIDTH = 1040;
const DETAIL_CARD_WIDTH = 250;

export function TransfigurationSiteScreen({
  view,
  onLeaveEmpty,
  onConfirm,
  onViewDeck,
}: TransfigurationSiteScreenProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [pickedEntryId, setPickedEntryId] = useState<string | null>(null);
  const [transitioningEntryId, setTransitioningEntryId] = useState<string | null>(null);
  const picked = view.candidates.find((candidate) => candidate.entryId === pickedEntryId) ?? null;
  const firstAffordable = picked?.forms.find((form) => form.essenceCost <= view.essence) ?? picked?.forms[0] ?? null;
  const [selectedType, setSelectedType] = useState<TransfigurationType | null>(null);
  const activeForm = picked?.forms.find((form) => form.type === selectedType) ?? firstAffordable;
  const sceneUrl = view.scene === null ? null : resolveArtRef(view.scene);

  const selectCard = (entryId: string): void => {
    const candidate = view.candidates.find((item) => item.entryId === entryId);
    if (candidate === undefined) return;
    const initial = candidate.forms.find((form) => form.essenceCost <= view.essence) ?? candidate.forms[0] ?? null;
    setSelectedType(initial?.type ?? null);
    setTransitioningEntryId(entryId);
    window.setTimeout(() => {
      setPickedEntryId(entryId);
      setTransitioningEntryId(null);
    }, 340);
  };

  const displayedModel = useMemo(
    () => activeForm?.previewModel ?? picked?.model ?? null,
    [activeForm, picked],
  );

  return (
    <div
      ref={stageRef}
      className="tango"
      data-testid="tango-transfiguration-site-screen"
      data-transfiguration-step={picked === null ? "pick" : "detail"}
      style={{
        position: "fixed",
        inset: 0,
        minHeight: "100dvh",
        overflow: "hidden",
        background: token("--bg-app"),
      }}
    >
      {sceneUrl !== null && <img src={sceneUrl} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      <Motes on tint="warm" />
      <LayoutGroup id={`transfiguration-${view.siteId}`}>
        <main style={{ position: "absolute", inset: 0, zIndex: 10, display: "grid", placeItems: "center", padding: `max(${token("--space-8")}, var(--safe-area-inset-top)) ${token("--space-8")} 150px` }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {picked === null ? (
              <motion.section
                key="pick"
                data-testid="tango-transfiguration-pick-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24 }}
                style={{ width: "100%", maxWidth: PANEL_MAX_WIDTH }}
              >
                <div style={{ ...glassSurfaceStyle(), overflow: "hidden", background: `${token("--glass-sheen")}, ${token("--glass-fill-popover")}` }}>
                  <header style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: token("--space-7"), borderBottom: `1px solid ${token("--border-soft")}` }}>
                    <div>
                      <h1 style={{ margin: 0, font: token("--t-title"), color: token("--text-on-glass") }}>Transfiguration</h1>
                      <p style={{ margin: `${token("--space-1")} 0 0`, font: token("--t-body"), color: token("--text-on-glass-muted") }}>Choose a card to reforge</p>
                    </div>
                    {view.candidates.length === 0 && <IconButton glyph={GLYPHS.close} label="Leave transfiguration" placement="onGlass" onPress={onLeaveEmpty} />}
                  </header>
                  {view.candidates.length === 0 ? (
                    <p style={{ margin: 0, padding: token("--space-10"), textAlign: "center", font: token("--t-body"), color: token("--text-on-glass") }}>No eligible cards to reforge.</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 188px))", justifyContent: "center", gap: token("--space-8"), padding: token("--space-9") }}>
                      {view.candidates.slice(0, 3).map((candidate) => (
                        <motion.div
                          key={candidate.entryId}
                          layoutId={`transfiguration-card-${candidate.entryId}`}
                          data-transfiguration-card={candidate.entryId}
                          animate={transitioningEntryId === null || transitioningEntryId === candidate.entryId ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                          transition={{ duration: 0.34, ease: [0.4, 0, 0.2, 1] }}
                          style={{ transformOrigin: "center" }}
                        >
                          <GameCard model={candidate.model} testId={`tango-transfiguration-card-${candidate.entryId}`} onActivate={() => selectCard(candidate.entryId)} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="detail"
                data-testid="tango-transfiguration-detail-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28, delay: 0.12 }}
                style={{ ...glassSurfaceStyle(), width: "100%", maxWidth: PANEL_MAX_WIDTH, minHeight: 560, overflow: "hidden", background: `${token("--glass-sheen")}, ${token("--glass-fill-popover")}` }}
              >
                <header style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", padding: token("--space-6"), borderBottom: `1px solid ${token("--border-soft")}` }}>
                  <IconButton glyph={GLYPHS.chevronLeft} label="Back to card choices" placement="onGlass" onPress={() => { setPickedEntryId(null); setSelectedType(null); }} testId="tango-transfiguration-back" />
                  <div style={{ textAlign: "center" }}>
                    <h1 style={{ margin: 0, font: token("--t-title"), color: token("--text-on-glass") }}>Transfiguration</h1>
                    <p style={{ margin: `${token("--space-1")} 0 0`, font: token("--t-caption"), color: token("--text-on-glass-muted") }}>Choose its new form</p>
                  </div>
                </header>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 0.9fr) minmax(420px, 1.35fr)", gap: token("--space-9"), alignItems: "center", padding: token("--space-8") }}>
                  <div style={{ display: "grid", placeItems: "center" }}>
                    {displayedModel !== null && (
                      <motion.div layoutId={`transfiguration-card-${picked.entryId}`} transition={{ layout: { duration: 0.48, ease: [0.22, 1, 0.36, 1] } }} style={{ width: DETAIL_CARD_WIDTH }}>
                        <GameCard model={{ ...displayedModel, transfiguration: activeForm?.previewDisplay }} large />
                      </motion.div>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: token("--space-4"), alignContent: "center" }}>
                    <div style={{ display: "grid", gap: token("--space-3") }}>
                      {picked.forms.map((form) => (
                        <OptionListItem key={form.type} optionId={form.type} title={form.type} description={form.effectDescription} accent={form.accent} glyph={form.glyph} cost={form.essenceCost} selected={activeForm?.type === form.type} disabled={form.essenceCost > view.essence} onSelect={(type) => setSelectedType(type as TransfigurationType)} />
                      ))}
                    </div>
                    <div style={{ justifySelf: "end", minWidth: 240, marginTop: token("--space-3") }}>
                      <Button full size="lg" label="Transfigure" cost={activeForm?.essenceCost ?? null} disabled={activeForm === null || activeForm.essenceCost > view.essence || view.alreadyAccepted} onClick={() => { if (activeForm !== null) onConfirm(picked.entryId, activeForm); }} />
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </LayoutGroup>
      <QuestStatusBar stageRef={stageRef} essence={view.hud.essence} deck={view.hud.deck} onViewDeck={onViewDeck} dreamcaller={view.hud.dreamcaller} dreamsigns={view.hud.dreamsigns} size="grand" />
    </div>
  );
}
