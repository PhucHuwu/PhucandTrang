export const ELEMENT_INTERACTION_ACTIONS = [
  'none',
  'open-video',
  'zoom',
  'open-link',
  'navigate-page',
  'play-audio',
] as const;

export type ElementInteractionAction = typeof ELEMENT_INTERACTION_ACTIONS[number];
