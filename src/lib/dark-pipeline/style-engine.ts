/**
 * Builds a dense prose style block from a StyleProfile for prepending to video scene prompts.
 * Format: continuous English text, no bullets, optimized for Wan 2.6 T2V consistency.
 */

interface StyleCharacter {
  id: string;
  name: string;
  physicalDescription: string;
}

interface StyleProfileInput {
  name: string;
  visual_description: string;
  color_palette: string | null;
  atmosphere: string | null;
  scene_types: string | null;
  characters: StyleCharacter[];
}

export function buildStyleBlock(profile: StyleProfileInput): string {
  const parts: string[] = [];

  parts.push(`VISUAL STYLE — "${profile.name}": ${profile.visual_description}.`);

  if (profile.color_palette) {
    parts.push(`Color palette: ${profile.color_palette}.`);
  }

  if (profile.atmosphere) {
    parts.push(`Atmosphere and mood: ${profile.atmosphere}.`);
  }

  if (profile.scene_types) {
    parts.push(`Preferred scene compositions: ${profile.scene_types}.`);
  }

  if (profile.characters?.length > 0) {
    for (const char of profile.characters) {
      parts.push(`CHARACTER "${char.name}": ${char.physicalDescription}. Same person in every frame, absolute visual consistency.`);
    }
  }

  parts.push("Maintain this exact visual style and character appearance consistently across all scenes.");

  return parts.join(" ");
}
