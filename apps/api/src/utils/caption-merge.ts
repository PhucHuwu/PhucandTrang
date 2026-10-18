export interface CaptionMergeElement {
  id: string;
  type: string;
  slot?: string | null;
  transform: any;
  data: any;
}

export interface CaptionMergePlan {
  captionId: string;
  mediaId: string;
  text: string;
}

const isMedia = (el: CaptionMergeElement) => el.type === 'IMAGE' || el.type === 'VIDEO';

export function isStandaloneCaption(el: CaptionMergeElement) {
  if (el.type !== 'TEXT') return false;
  return el.data?.variant === 'caption' || Boolean(el.slot?.endsWith('-caption'));
}

function captionText(el: CaptionMergeElement): string {
  const d = el.data || {};
  if (typeof d.text === 'string') return d.text;
  return Array.isArray(d.textLines) ? d.textLines.join(' ') : '';
}

/**
 * Pairs each standalone caption TEXT element with its media element:
 * first by slot ("primaryImage-caption" → "primaryImage"), otherwise the
 * horizontally-overlapping media whose bottom edge is closest to the caption.
 * Media that already has its own caption is never overwritten.
 */
export function planCaptionMerge(elements: CaptionMergeElement[]): CaptionMergePlan[] {
  const media = elements.filter(isMedia);
  const taken = new Set(media.filter((m) => m.data?.caption).map((m) => m.id));
  const plans: CaptionMergePlan[] = [];

  for (const caption of elements.filter(isStandaloneCaption)) {
    const text = captionText(caption).trim();
    if (!text) continue;

    const slotTarget = caption.slot?.endsWith('-caption') ? caption.slot.slice(0, -'-caption'.length) : null;
    let target = media.find((m) => slotTarget && m.slot === slotTarget && !taken.has(m.id));

    if (!target) {
      const c = caption.transform || {};
      let best = Infinity;
      for (const m of media) {
        if (taken.has(m.id)) continue;
        const t = m.transform || {};
        const overlap = Math.min(c.x + c.width, t.x + t.width) - Math.max(c.x, t.x);
        if (overlap <= 0) continue;
        const distance = Math.abs(c.y - (t.y + t.height));
        if (distance < best && distance <= 0.1) {
          best = distance;
          target = m;
        }
      }
    }

    if (!target) continue;
    taken.add(target.id);
    plans.push({ captionId: caption.id, mediaId: target.id, text });
  }

  return plans;
}
