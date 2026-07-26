export type ThemeId =
  | "light-warm"
  | "light-ocean"
  | "light-emerald"
  | "light-rose";

export type ThemeOption = {
  id: ThemeId;
  label: string;
  description: string;
  swatches: [string, string, string];
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "light-warm",
    label: "Light Warm",
    description: "Soft orange light theme",
    swatches: ["#ffedd5", "#fb923c", "#fbbf24"],
  },
  {
    id: "light-ocean",
    label: "Light Ocean",
    description: "Soft blue light theme",
    swatches: ["#dbeafe", "#60a5fa", "#93c5fd"],
  },
  {
    id: "light-emerald",
    label: "Light Emerald",
    description: "Soft green light theme",
    swatches: ["#d1fae5", "#34d399", "#6ee7b7"],
  },
  {
    id: "light-rose",
    label: "Light Rose",
    description: "Soft pink light theme",
    swatches: ["#ffe4e6", "#fb7185", "#fda4af"],
  },
];

export const DEFAULT_THEME: ThemeId = "light-warm";
export const THEME_STORAGE_KEY = "kitchen-theme";

/** Map older theme ids to current light themes */
const LEGACY_THEME_MAP: Record<string, ThemeId> = {
  festival: "light-warm",
  ocean: "light-ocean",
  emerald: "light-emerald",
  rose: "light-rose",
  light: "light-warm",
};

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEME_OPTIONS.some((t) => t.id === value);
}

export function resolveThemeId(value: string | null | undefined): ThemeId {
  if (isThemeId(value)) return value;
  if (value && LEGACY_THEME_MAP[value]) return LEGACY_THEME_MAP[value];
  return DEFAULT_THEME;
}
