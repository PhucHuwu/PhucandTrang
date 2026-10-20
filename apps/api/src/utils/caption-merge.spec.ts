import { planCaptionMerge } from './caption-merge';

const box = (x: number, y: number, width: number, height: number) => ({
  x,
  y,
  width,
  height,
});

describe('planCaptionMerge', () => {
  it('pairs by slot name first', () => {
    const plans = planCaptionMerge([
      {
        id: 'a',
        type: 'IMAGE',
        slot: 'primaryImage',
        transform: box(0.1, 0.1, 0.4, 0.3),
        data: {},
      },
      {
        id: 'b',
        type: 'IMAGE',
        slot: 'secondaryImage',
        transform: box(0.5, 0.1, 0.4, 0.3),
        data: {},
      },
      {
        id: 'c',
        type: 'TEXT',
        slot: 'secondaryImage-caption',
        transform: box(0.1, 0.41, 0.4, 0.03),
        data: { text: 'Hai', variant: 'caption' },
      },
    ]);
    expect(plans).toEqual([{ captionId: 'c', mediaId: 'b', text: 'Hai' }]);
  });

  it('falls back to the overlapping media directly above', () => {
    const plans = planCaptionMerge([
      {
        id: 'top',
        type: 'IMAGE',
        transform: box(0.1, 0.05, 0.8, 0.2),
        data: {},
      },
      {
        id: 'low',
        type: 'VIDEO',
        transform: box(0.1, 0.4, 0.8, 0.3),
        data: {},
      },
      {
        id: 'cap',
        type: 'TEXT',
        transform: box(0.1, 0.71, 0.8, 0.03),
        data: { textLines: ['Biển', 'đêm'], variant: 'caption' },
      },
    ]);
    expect(plans).toEqual([
      { captionId: 'cap', mediaId: 'low', text: 'Biển đêm' },
    ]);
  });

  it('never overwrites an existing caption or uses unrelated text', () => {
    const plans = planCaptionMerge([
      {
        id: 'img',
        type: 'IMAGE',
        slot: 'primaryImage',
        transform: box(0.1, 0.1, 0.8, 0.3),
        data: { caption: 'Có sẵn' },
      },
      {
        id: 'cap',
        type: 'TEXT',
        slot: 'primaryImage-caption',
        transform: box(0.1, 0.41, 0.8, 0.03),
        data: { text: 'Mới', variant: 'caption' },
      },
      {
        id: 'body',
        type: 'TEXT',
        slot: 'body',
        transform: box(0.1, 0.41, 0.8, 0.03),
        data: { text: 'Đoạn văn', variant: 'body' },
      },
    ]);
    expect(plans).toEqual([]);
  });
});
