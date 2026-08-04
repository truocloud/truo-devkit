/**
 * Public parameter name -> canonical wire name.
 *
 * GENERATED from the shared fixture by `bun run gen`. Do not edit.
 *
 * Only the aliases are here: a name that already is its canonical form maps to
 * itself and does not need a row. Lookup normalises first (lowercase, no `-`
 * or `_`), which is what makes `withoutEnlargement`, `without_enlargement`
 * and `WITHOUTENLARGEMENT` the same parameter.
 */
const ALIASES: Record<string, string> = {
  "adaptive": "af",
  "align": "a",
  "background": "bg",
  "brightness": "bri",
  "contrast": "con",
  "filter": "filt",
  "fm": "f",
  "focus": "a",
  "format": "f",
  "frames": "n",
  "gamma": "gam",
  "gravity": "a",
  "height": "h",
  "interlace": "il",
  "level": "l",
  "lossless": "ll",
  "output": "f",
  "progressive": "il",
  "quality": "q",
  "rot": "ro",
  "rotate": "ro",
  "saturation": "sat",
  "sharpen": "sharp",
  "t": "fit",
  "width": "w",
  "withoutenlargement": "we"
};

/** Every canonical name the service understands. */
export const CANONICAL_NAMES: readonly string[] = ["a","af","bg","blur","bri","cbg","con","crop","dpr","f","filename","filt","fit","flip","flop","gam","h","hue","il","l","ll","mask","mbg","mod","mtrim","n","page","precrop","q","rbg","ro","sat","sharp","tbg","tint","trim","w","we"];

const CANONICAL = new Set(CANONICAL_NAMES);

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[-_]/g, "");
}

/**
 * `null` when we do not know the name. The caller still emits it, lowercased:
 * the service drops unknown parameters in silence (real HTML carries `?ver=6.4`
 * glued to image URLs), and a builder that threw here would break pages over
 * decoration.
 */
export function canonicalName(name: string): string | null {
  const key = normalize(name);
  return ALIASES[key] ?? (CANONICAL.has(key) ? key : null);
}
