import { OptionListItem } from "../../components/controls/OptionListItem";
import { GLYPHS } from "../../primitives/glyph";
import type { TangoComponent } from "../registry";

function OptionListItemDemo() {
  return (
    <div style={{ width: 480 }}>
      <OptionListItem
        optionId="empowered"
        title="Empowered"
        description="Increase this character's spark."
        accent="#c85cf5"
        glyph={GLYPHS.spark}
        cost={40}
        selected
        onSelect={() => {}}
      />
    </div>
  );
}

export const optionListItemDemo: TangoComponent = {
  id: "option-list-item",
  title: "Option List Item",
  blurb: "A compact selectable row for a named effect, its identifying glyph, and an essence price.",
  callout: "Use inside a bounded choice panel when each option needs enough explanation to exceed a segmented control or simple button.",
  group: "Components",
  docName: "OptionListItem",
  Component: OptionListItemDemo,
  usage: [{
    code: `import { OptionListItem } from "src/tango/components/controls/OptionListItem";

<OptionListItem
  optionId="empowered"
  title="Empowered"
  description="Increase this character's spark."
  accent="#c85cf5"
  glyph={GLYPHS.spark}
  cost={40}
  selected
  onSelect={selectOption}
/>`,
  }],
  demo: { defaultArgs: {} },
};
