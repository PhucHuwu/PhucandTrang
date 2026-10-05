import { LazyPageTextureManager } from './LazyPageTextureManager';
import { PageTextureGenerator } from './PageTextureGenerator';

jest.mock('three', () => ({ LinearFilter: 1006 }));

jest.mock('./PageTextureGenerator', () => ({
  PageTextureGenerator: {
    createCoverTexture: jest.fn(),
    createBackCoverTexture: jest.fn(),
    renderPageTexture: jest.fn(),
  },
}));

describe('texture scheduling', () => {
  let encode: jest.Mock;
  const book = {
    pages: Array.from({ length: 50 }, (_, id) => ({ id })),
    cover: { front: { backgroundUrl: 'front' }, back: {} },
  } as any;
  const texture = () => ({ image: { toDataURL: encode }, dispose: jest.fn() });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    encode = jest.fn(() => 'placeholder');
    (global as any).document = {
      hidden: false,
      createElement: () => ({ getContext: () => ({ fillRect: jest.fn() }), toDataURL: encode }),
    };
    for (const render of Object.values(PageTextureGenerator)) {
      (render as jest.Mock).mockImplementation(async (...args: any[]) => {
        await args[args.length - 1]();
        return texture();
      });
    }
  });

  afterEach(() => { jest.useRealTimers(); delete (global as any).document; });

  it('never encodes page canvases and shares in-flight rendering', async () => {
    const manager = new LazyPageTextureManager(book);
    const a = manager.getPageTextureEntry(1);
    const b = manager.getPageTextureEntry(1);
    await jest.advanceTimersByTimeAsync(64);
    expect(await a).toBe(await b);
    expect(PageTextureGenerator.renderPageTexture).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledTimes(1); // Only the 16px placeholder.
    manager.destroy();
  });

  it('waits during turns and processes only one page at a time', async () => {
    let busy = true;
    const manager = new LazyPageTextureManager(book, () => busy);
    const ready = jest.fn();
    await manager.updateActiveWindow(0, ready);
    await jest.advanceTimersByTimeAsync(200);
    expect(PageTextureGenerator.createCoverTexture).not.toHaveBeenCalled();
    busy = false;
    await jest.advanceTimersByTimeAsync(100);
    expect(ready).toHaveBeenCalledTimes(1);
    busy = true;
    await jest.advanceTimersByTimeAsync(200);
    expect(ready).toHaveBeenCalledTimes(1);
    manager.destroy();
    await jest.advanceTimersByTimeAsync(40);
  });

  it('reuses the startup window instead of rasterizing the first spreads again', async () => {
    const manager = new LazyPageTextureManager(book);
    for (let index = 0; index < 9; index++) {
      const pending = manager.getPageTextureEntry(index);
      await jest.advanceTimersByTimeAsync(40);
      await pending;
    }
    jest.clearAllMocks();
    const ready = jest.fn();
    await manager.updateActiveWindow(1, ready);
    await jest.advanceTimersByTimeAsync(200);
    expect(PageTextureGenerator.renderPageTexture).not.toHaveBeenCalled();
    expect(PageTextureGenerator.createCoverTexture).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    manager.destroy();
  });

  it('does not render an undefined face when the queue is emptied during an idle wait', async () => {
    const manager = new LazyPageTextureManager(book);
    const ready = jest.fn();
    await manager.updateActiveWindow(0, ready);
    // Populate the same window before the background worker resumes.
    (manager as any).cache = new Map(Array.from({ length: 7 }, (_, index) => [
      index, { dataUrl: 'placeholder', canvasTexture: texture(), lastAccessed: 0 },
    ]));
    await manager.updateActiveWindow(0, ready);
    await jest.advanceTimersByTimeAsync(100);
    expect(PageTextureGenerator.createBackCoverTexture).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    expect((manager as any).cache.has(undefined)).toBe(false);
    manager.destroy();
  });

  it('continues preparing later faces after a single render fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (PageTextureGenerator.createCoverTexture as jest.Mock).mockRejectedValueOnce(new Error('bad cover'));
    const manager = new LazyPageTextureManager(book);
    const ready = jest.fn();
    await manager.updateActiveWindow(0, ready);
    await jest.advanceTimersByTimeAsync(500);
    expect(ready.mock.calls.some(([index]) => index === 1)).toBe(true);
    expect(ready.mock.calls.some(([index]) => index === 2)).toBe(true);
    manager.destroy();
    await jest.advanceTimersByTimeAsync(40);
    warn.mockRestore();
  });

  it('disposes a render that completes after destruction without repopulating cache', async () => {
    let finish!: (value: any) => void;
    (PageTextureGenerator.renderPageTexture as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const manager = new LazyPageTextureManager(book);
    const pending = manager.getPageTextureEntry(1);
    manager.destroy();
    const lateTexture = texture();
    finish(lateTexture);
    await pending;
    expect(lateTexture.dispose).toHaveBeenCalledTimes(1);
    expect(manager.getCacheSize()).toBe(0);
  });

  it('detaches evicted textures before disposal and retains the visible window', async () => {
    const manager = new LazyPageTextureManager(book);
    const entries: any[] = [];
    for (let index = 0; index < 22; index++) {
      const pending = manager.getPageTextureEntry(index);
      await jest.advanceTimersByTimeAsync(40);
      entries.push(await pending);
    }
    const detach = jest.fn((index: number) => {
      expect(entries[index].canvasTexture.dispose).not.toHaveBeenCalled();
    });
    await manager.updateActiveWindow(8, detach);
    (manager as any).prune();
    expect(detach).toHaveBeenCalled();
    expect(entries[16].canvasTexture.dispose).not.toHaveBeenCalled();
    expect(manager.getCacheSize()).toBeLessThanOrEqual(16);
    manager.destroy();
    await jest.advanceTimersByTimeAsync(40);
  });
});
