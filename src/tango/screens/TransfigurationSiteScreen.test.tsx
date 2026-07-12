// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asCardId, asCardName } from "../../types/card-identity";
import type { CardData } from "../../types/cards";
import { GLYPHS } from "../primitives/glyph";
import { TangoRoot } from "../TangoRoot";
import { TransfigurationSiteScreen, type TransfigurationSiteView } from "./TransfigurationSiteScreen";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function card(id: string, number: number): CardData {
  return { id: asCardId(id), name: asCardName(`Card ${String(number)}`), cardNumber: number, cardType: "Character", subtype: "", isStarter: false, energyCost: 2, spark: 2, isFast: false, renderedText: "", imageNumber: number, artOwned: true };
}

function view(): TransfigurationSiteView {
  return {
    siteId: "site-1",
    scene: null,
    essence: 100,
    alreadyAccepted: false,
    hud: { essence: 100, deck: 3, dreamsigns: [] },
    candidates: [1, 2, 3].map((number) => {
      const snapshot = card(`card-${String(number)}`, number);
      return {
        entryId: `entry-${String(number)}`,
        model: { cardId: snapshot.id, displaySnapshot: snapshot },
        forms: [{ type: "Empowered", effectDescription: "Increase spark.", effectDetails: {}, essenceCost: 20, accent: "#c85cf5", glyph: GLYPHS.spark, previewModel: { cardId: snapshot.id, displaySnapshot: { ...snapshot, spark: 3 } }, previewDisplay: { type: "Empowered", color: "#e7b2fa", markedText: "", energyChanged: false, sparkChanged: true, fastChanged: false } }],
      };
    }),
  };
}

describe("TransfigurationSiteScreen", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }) });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("shows exactly three standard candidates in the glass picker", () => {
    act(() => root.render(<TangoRoot><TransfigurationSiteScreen view={view()} onLeaveEmpty={() => {}} onConfirm={() => {}} /></TangoRoot>));
    expect(container.querySelectorAll("[data-testid^='tango-transfiguration-card-']")).toHaveLength(3);
    expect(container.querySelector("[data-transfiguration-step='pick']")).not.toBeNull();
  });

  it("travels into detail, supports back, and commits the selected form", () => {
    const confirm = vi.fn();
    act(() => root.render(<TangoRoot><TransfigurationSiteScreen view={view()} onLeaveEmpty={() => {}} onConfirm={confirm} /></TangoRoot>));
    const cardButton = container.querySelector<HTMLElement>("[data-testid='tango-transfiguration-card-entry-1']");
    act(() => cardButton?.click());
    act(() => vi.advanceTimersByTime(340));
    expect(container.querySelector("[data-testid='tango-transfiguration-detail-panel']")).not.toBeNull();
    const commit = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Transfigure"));
    act(() => commit?.click());
    expect(confirm).toHaveBeenCalledWith("entry-1", expect.objectContaining({ type: "Empowered" }));
    act(() => container.querySelector<HTMLElement>("[data-testid='tango-transfiguration-back']")?.click());
    expect(container.querySelector("[data-transfiguration-step='pick']")).not.toBeNull();
  });
});
