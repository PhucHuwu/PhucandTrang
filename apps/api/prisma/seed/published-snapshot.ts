/** Pre-compiles the publishedSnapshot document served to production viewers. */
export function compilePublishedSnapshot(params: {
  book: any;
  audioTrack: any;
  fullBookForSnapshot: any;
  canonicalCover: unknown;
  canonicalSettings: unknown;
  firstCoverUrl: string;
  lastCoverUrl: string;
}) {
  const {
    book,
    audioTrack,
    fullBookForSnapshot,
    canonicalCover,
    canonicalSettings,
    firstCoverUrl,
    lastCoverUrl,
  } = params;

  const publishedPagesCompiled = (fullBookForSnapshot?.pages || []).map(
    (page: any) => {
      return {
        id: page.id,
        order: page.order,
        displayPageNumber: page.pageNumber,
        pageNumber: page.pageNumber,
        side: page.side.toLowerCase(),
        chapter: page.chapter,
        title: page.title,
        quote: page.quote,
        handwriting: page.handwriting,
        layout: page.layoutTemplateId || 'auto',
        layoutMode: page.layoutMode || 'PRESET',
        background: page.background,
        elements: (page.elements || []).map((el: any) => ({
          id: el.id,
          type: el.type,
          slot: el.slot,
          order: el.order,
          zIndex: el.zIndex,
          opacity: el.opacity,
          transform: el.transform,
          style: el.style,
          data: el.data,
          interaction: el.interaction,
        })),
        audio: null,
      };
    },
  );

  return {
    id: book.id,
    title: book.title,
    description: book.description,
    contentRevision: 1,
    couple: {
      he: book.heName,
      she: book.sheName,
      anniversaryDate: book.anniversaryDate
        ? new Date(book.anniversaryDate).toISOString()
        : '2022-10-20T00:00:00Z',
      proposalQuote: book.proposalQuote,
    },
    cover: canonicalCover,
    audio: {
      id: audioTrack.id,
      title: audioTrack.title,
      artist: audioTrack.artist,
      src: audioTrack.src,
      mediaId: null,
      autoPlay: audioTrack.autoPlay ?? true,
      loop: audioTrack.loop ?? true,
      volume: audioTrack.volume ?? 0.8,
      startAt: audioTrack.startAt ?? 0.0,
      fadeIn: audioTrack.fadeIn ?? 2.0,
      fadeOut: audioTrack.fadeOut ?? 2.0,
      durationSeconds: audioTrack.durationSeconds ?? null,
    },
    settings: canonicalSettings,
    pages: publishedPagesCompiled,
    media: {
      allUrls: [firstCoverUrl, lastCoverUrl, audioTrack.src],
      images: [firstCoverUrl, lastCoverUrl],
      videos: [],
      audio: [audioTrack.src],
      backgrounds: [firstCoverUrl, lastCoverUrl],
    },
    publishedAt: new Date().toISOString(),
    version: '2.0.0',
  };
}
