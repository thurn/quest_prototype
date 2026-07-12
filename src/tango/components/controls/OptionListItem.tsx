import type { ReactElement } from "react";
import { resolveColor, withAlpha, type TangoColor } from "../../primitives/color";
import type { Glyph } from "../../primitives/glyph";
import { Pressable } from "../../primitives/Pressable";
import { token } from "../../primitives/tokens";
import { EssenceValue } from "../hud/EssenceValue";

export interface OptionListItemProps {
  /** Stable id exposed to browser QA and screen tests. */
  optionId: string;
  /** Short option name. */
  title: string;
  /** One-line explanation of the option's effect. */
  description: string;
  /** Semantic or data-driven accent attached to this option. */
  accent: TangoColor;
  /** Glyph that identifies the option family. */
  glyph: Glyph;
  /** Essence paid when this option is committed. */
  cost: number;
  /** Whether this option is the current choice. */
  selected?: boolean;
  /** Whether this option cannot be chosen. */
  disabled?: boolean;
  /** Called with the stable option id when activated. */
  onSelect: (optionId: string) => void;
}

/** A compact selectable row for a titled effect and its economy cost. */
export function OptionListItem({
  optionId,
  title,
  description,
  accent,
  glyph,
  cost,
  selected = false,
  disabled = false,
  onSelect,
}: OptionListItemProps): ReactElement {
  const color = resolveColor(accent);
  return (
    <Pressable
      as="button"
      data-option-id={optionId}
      data-option-selected={selected || undefined}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(optionId)}
      style={{
        width: "100%",
        minHeight: 82,
        display: "grid",
        gridTemplateColumns: "44px minmax(0, 1fr) auto",
        alignItems: "center",
        gap: token("--space-4"),
        padding: token("--space-4"),
        borderRadius: token("--radius-control"),
        border: `1px solid ${selected ? color : token("--border-soft")}`,
        background: selected
          ? withAlpha(accent, 0.18)
          : token("--surface-card"),
        boxShadow: selected ? `0 0 24px ${withAlpha(accent, 0.24)}` : "none",
        color: token("--text-primary"),
        textAlign: "left",
        opacity: disabled ? 0.42 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          display: "grid",
          placeItems: "center",
          borderRadius: token("--radius-pill"),
          background: withAlpha(accent, 0.16),
          color,
          fontSize: 24,
        }}
      >
        <i className={glyph} />
      </span>
      <span style={{ minWidth: 0, display: "grid", gap: token("--space-1") }}>
        <span style={{ font: token("--t-lead") }}>{title}</span>
        <span style={{ font: token("--t-caption"), color: token("--text-secondary") }}>
          {description}
        </span>
      </span>
      <span style={{ font: token("--t-body"), color: token("--text-primary") }}>
        {cost === 0 ? "Free" : <EssenceValue amount={cost} tone="inherit" />}
      </span>
    </Pressable>
  );
}
