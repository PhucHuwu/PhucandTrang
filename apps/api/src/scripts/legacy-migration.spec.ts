import { buildExactUrlLookup, planLegacyMigration } from './legacy-migration';

describe('legacy-migration planning', () => {
  const lookup = buildExactUrlLookup([
    {
      id: 'm-photo',
      url: 'https://res.cloudinary.com/x/image/upload/photo.jpg',
    },
    {
      id: 'm-cover',
      url: 'https://res.cloudinary.com/x/image/upload/cover.jpg',
    },
  ]);

  it('matches URLs exactly (trimmed) and never by substring', () => {
    expect(
      lookup(' https://res.cloudinary.com/x/image/upload/photo.jpg '),
    ).toBe('m-photo');
    // substring / superstring of a known URL must NOT match
    expect(
      lookup('https://res.cloudinary.com/x/image/upload/photo.jpg?w=200'),
    ).toBeNull();
    expect(lookup('photo.jpg')).toBeNull();
    expect(lookup('')).toBeNull();
    expect(lookup(undefined)).toBeNull();
  });

  it('plans cover/background/element changes without mutating the input', () => {
    const book = {
      id: 'b1',
      cover: {
        front: {
          backgroundUrl: 'https://res.cloudinary.com/x/image/upload/cover.jpg',
        },
      },
      pages: [
        {
          id: 'p1',
          background: {
            imageUrl: 'https://res.cloudinary.com/x/image/upload/photo.jpg',
          },
          elements: [
            {
              id: 'e1',
              data: {
                src: 'https://res.cloudinary.com/x/image/upload/photo.jpg',
              },
            },
            { id: 'e2', data: { src: 'https://other.example.com/photo.jpg' } },
            {
              id: 'e3',
              data: {
                src: 'https://res.cloudinary.com/x/image/upload/photo.jpg',
                mediaId: 'keep',
              },
            },
          ],
        },
      ],
    };
    const snapshot = JSON.stringify(book);

    const plan = planLegacyMigration(book, lookup);

    expect(plan.cover.front.mediaId).toBe('m-cover');
    expect(plan.pageBackgrounds).toEqual([
      {
        pageId: 'p1',
        background: {
          imageUrl: book.pages[0].background.imageUrl,
          mediaId: 'm-photo',
        },
      },
    ]);
    expect(plan.elements.map((e) => e.elementId)).toEqual(['e1']);
    expect(plan.elements[0].data.mediaId).toBe('m-photo');
    expect(JSON.stringify(book)).toBe(snapshot);
    // The plan never contains publishedSnapshot writes
    expect(JSON.stringify(plan)).not.toContain('publishedSnapshot');
  });
});
