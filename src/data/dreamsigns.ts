import { packageTideAccent } from "./card-database";
import type { Tide } from "../types/cards";
import type { DreamsignTemplate } from "../types/content";
import type { Dreamsign } from "../types/quest";

const DREAMSIGN_JSON_PATH = "/dreamsign-data.json";

interface RawDreamsign {
  id: string;
  name: string;
  imageName: string;
  imageAlt: string;
  effectDescription: string;
  packageTides: string[];
}

function deriveDisplayTide(packageTides: readonly string[]): Tide {
  if (packageTides.length === 0) {
    return "Neutral";
  }
  return packageTideAccent(packageTides[0]);
}

/** Fetches canonical Dreamsign data from the asset pipeline output. */
export async function loadDreamsignTemplates(): Promise<DreamsignTemplate[]> {
  const response = await fetch(DREAMSIGN_JSON_PATH);
  if (!response.ok) {
    throw new Error(
      `Failed to load Dreamsign data: ${String(response.status)} ${response.statusText}`,
    );
  }
  const raw = (await response.json()) as RawDreamsign[];
  return raw.map((entry) => ({
    id: entry.id,
    name: entry.name,
    effectDescription: entry.effectDescription,
    displayTide: deriveDisplayTide(entry.packageTides),
    packageTides: [...entry.packageTides],
    imageName: entry.imageName,
    imageAlt: entry.imageAlt,
  }));
}

/** Instantiates a collectible Dreamsign from a template. */
export function createDreamsign(
  template: DreamsignTemplate,
  isBane = false,
): Dreamsign {
  return {
    id: template.id,
    name: template.name,
    tide: template.displayTide,
    effectDescription: template.effectDescription,
    imageName: template.imageName,
    imageAlt: template.imageAlt,
    isBane,
  };
}
