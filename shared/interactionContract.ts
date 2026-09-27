export const ELEMENT_INTERACTION_ACTIONS = [
  'none',
  'open-video',
  'zoom',
  'open-link',
  'navigate-page',
  'play-audio',
] as const;

export type ElementInteractionAction = typeof ELEMENT_INTERACTION_ACTIONS[number];

export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateInteractionTarget(
  action: ElementInteractionAction,
  target: unknown
): string | null {
  if (action === 'none' || action === 'zoom') return null;

  if (action === 'open-link') {
    return isValidHttpUrl(target)
      ? null
      : 'open-link yêu cầu target là URL http/https hợp lệ.';
  }

  if (action === 'navigate-page') {
    if (typeof target === 'number' && Number.isFinite(target)) return null;
    if (typeof target === 'string' && target.trim().length > 0) return null;
    return 'navigate-page yêu cầu target là page ID hoặc page number.';
  }

  if (action === 'play-audio') {
    return typeof target === 'string' && target.trim().length > 0
      ? null
      : 'play-audio yêu cầu target là AudioTrack ID.';
  }

  if (action === 'open-video') {
    return typeof target === 'string' && target.trim().length > 0
      ? null
      : 'open-video yêu cầu target là video media ID hoặc URL runtime.';
  }

  return null;
}
