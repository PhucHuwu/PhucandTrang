import { test, expect, Page as PwPage, Request } from '@playwright/test';

type MockElement = Record<string, any> & { id: string };
type MockPage = Record<string, any> & { id: string; elements: MockElement[]; updatedAt: string };

// The first test also pays for dev-server compilation of the editor route
test.describe.configure({ timeout: 90000 });

const TEXT_PLACEHOLDER = 'Nhập nội dung chữ hoặc chèn biến động...';

function textElement(id: string, text: string): MockElement {
  return {
    id,
    type: 'TEXT',
    slot: 'body',
    zIndex: 1,
    order: 0,
    visible: true,
    locked: false,
    opacity: 1,
    transform: { x: 0.1, y: 0.2, width: 0.6, height: 0.2, rotation: 0, scale: 1 },
    style: { fontSize: 24 },
    data: { text, variant: 'body' },
    interaction: null,
  };
}

function makePage(id: string, pageNumber: number, text: string): MockPage {
  return {
    id,
    bookId: 'journal-test',
    pageNumber,
    order: pageNumber,
    side: pageNumber % 2 ? 'right' : 'left',
    title: `Trang ${id}`,
    isCustomized: true,
    background: { type: 'color', color: '#fff' },
    updatedAt: '2026-10-01T00:00:00.000Z',
    elements: [textElement(`text-${id}`, text)],
  };
}

interface SaveCall {
  pageId: string;
  body: any;
}

interface MockOptions {
  /** Return a custom response for POST /pages/:id/save; undefined = default 200 */
  onSave?: (call: SaveCall, index: number) => { status: number; body: unknown } | undefined;
  saveDelayMs?: number;
}

/** Stateful in-memory backend behind the BFF proxy. */
async function mockAdmin(page: PwPage, pages: MockPage[], options: MockOptions = {}) {
  // Passes the middleware's session-cookie UX guard; every API call is mocked below
  await page.context().addCookies([{ name: 'admin_access_token', value: 'test', url: test.info().project.use.baseURL! }]);
  const db = new Map(pages.map((p) => [p.id, JSON.parse(JSON.stringify(p)) as MockPage]));
  const saves: SaveCall[] = [];
  const deletes: string[] = [];
  let clock = Date.parse('2026-10-02T00:00:00.000Z');
  const bump = (p: MockPage) => {
    clock += 1000;
    p.updatedAt = new Date(clock).toISOString();
  };
  const journal = () => ({
    id: 'journal-test',
    title: 'Nhật ký kiểm thử',
    pages: Array.from(db.values()),
    settings: {},
    cover: { front: { elements: [] } },
  });

  await page.route('**/api/admin/**', async (route) => {
    const req = route.request();
    const method = req.method();
    const path = new URL(req.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path.endsWith('/auth/me')) return json({ authenticated: true, user: { id: 'test', name: 'Kiểm thử', role: 'ADMIN' } });
    if (path.endsWith('/journal')) return json(journal());

    const save = path.match(/\/pages\/([^/]+)\/save$/);
    if (save && method === 'POST') {
      const call: SaveCall = { pageId: save[1], body: req.postDataJSON() };
      const index = saves.push(call) - 1;
      if (options.saveDelayMs) await new Promise((r) => setTimeout(r, options.saveDelayMs));
      const custom = options.onSave?.(call, index);
      if (custom) return json(custom.body, custom.status);
      const stored = db.get(call.pageId);
      if (!stored) return json({ message: 'Page not found' }, 404);
      Object.assign(stored, call.body.page || {});
      for (const el of call.body.elements || []) {
        const existing = stored.elements.find((e) => e.id === el.id);
        if (existing) Object.assign(existing, el);
        else stored.elements.push(el);
      }
      bump(stored);
      return json({ page: stored, skippedElementIds: [] });
    }

    const element = path.match(/\/page-elements\/([^/]+)$/);
    if (element && method === 'DELETE') {
      deletes.push(element[1]);
      for (const p of db.values()) {
        const before = p.elements.length;
        p.elements = p.elements.filter((e) => e.id !== element[1]);
        if (p.elements.length !== before) bump(p);
      }
      return json({ success: true });
    }

    if (/\/pages\/book\/[^/]+$/.test(path)) return json(Array.from(db.values()));
    const single = path.match(/\/pages\/([^/]+)$/);
    if (single && method === 'GET') {
      const stored = db.get(single[1]);
      return stored ? json(stored) : json({ message: 'Page not found' }, 404);
    }
    if (path.includes('/media')) return json({ items: [], total: 0 });
    if (path.includes('/audio') || path.includes('/versions') || path.includes('/layout-templates')) return json([]);
    return json({});
  });

  return { db, saves, deletes };
}

async function openEditor(page: PwPage, pageId: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/admin/pages/${pageId}`);
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await openPanel(page, 'Thuộc tính');
  await expect(page.getByPlaceholder(TEXT_PLACEHOLDER)).toBeVisible();
}

/** Side panels are overlays in the compact (touch) layout; open one explicitly. */
async function openPanel(page: PwPage, name: 'Thuộc tính' | 'Lớp') {
  const panel = page.locator(name === 'Lớp' ? '.editor-layers' : '.editor-properties');
  // In dev mode the button can render before hydration attaches handlers, so retry the click.
  await expect(async () => {
    if (!(await panel.isVisible())) await page.getByRole('button', { name, exact: true }).click();
    await expect(panel).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

const isSave = (req: Request, pageId: string) =>
  req.method() === 'POST' && new URL(req.url()).pathname.endsWith(`/pages/${pageId}/save`);

test('quick page switch never writes the old page content into the new page', async ({ page }) => {
  const pageA = makePage('page-a', 1, 'Nội dung gốc A');
  const pageB = makePage('page-b', 2, 'Nội dung gốc B');
  // A slow save widens the window in which the old editor could still be running
  const mock = await mockAdmin(page, [pageA, pageB], { saveDelayMs: 400 });

  await openEditor(page, 'page-a');
  const input = page.getByPlaceholder(TEXT_PLACEHOLDER);
  await input.fill('Chỉnh sửa trên trang A');

  // Switch well inside the 800ms autosave debounce
  await openPanel(page, 'Lớp');
  await page.locator('a[href="/admin/pages/page-b"]').click();
  await expect(page).toHaveURL(/\/admin\/pages\/page-b$/);
  await expect(page.locator('.editor-header h1')).toContainText('Trang page-b');
  await openPanel(page, 'Thuộc tính');
  await expect(page.getByPlaceholder(TEXT_PLACEHOLDER)).toHaveValue('Nội dung gốc B');

  // Give any stray debounce / unmount flush time to fire
  await page.waitForTimeout(2000);

  const savesA = mock.saves.filter((s) => s.pageId === 'page-a');
  const savesB = mock.saves.filter((s) => s.pageId === 'page-b');
  expect(savesA.length).toBeGreaterThan(0);
  expect(JSON.stringify(savesA[savesA.length - 1].body)).toContain('Chỉnh sửa trên trang A');
  // Loading B is not an edit, and A's content never lands on B
  expect(savesB).toHaveLength(0);
  expect(JSON.stringify(mock.db.get('page-b'))).not.toContain('Chỉnh sửa trên trang A');
  expect(mock.db.get('page-b')!.elements.map((e) => e.id)).toEqual(['text-page-b']);
});

test('a 409 conflict pauses autosave and shows the reload / overwrite prompt', async ({ page }) => {
  const pageA = makePage('page-a', 1, 'Nội dung gốc A');
  const mock = await mockAdmin(page, [pageA], {
    onSave: (_call, index) =>
      index === 0
        ? {
            status: 409,
            body: {
              code: 'PAGE_CONFLICT',
              message: 'Trang đã được thay đổi',
              currentUpdatedAt: '2026-10-05T00:00:00.000Z',
            },
          }
        : undefined,
  });

  await openEditor(page, 'page-a');
  await page.getByPlaceholder(TEXT_PLACEHOLDER).fill('Bản chỉnh sửa xung đột');

  const dialog = page.getByRole('dialog', { name: 'Xung đột chỉnh sửa' });
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await expect(dialog.getByRole('button', { name: 'Tải bản mới nhất' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Ghi đè' })).toBeVisible();
  expect(mock.saves[0].body.baseUpdatedAt).toBe(pageA.updatedAt);

  // No further autosave while the conflict is unresolved
  await page.waitForTimeout(1500);
  expect(mock.saves).toHaveLength(1);

  const overwrite = page.waitForRequest((req) => isSave(req, 'page-a'));
  await dialog.getByRole('button', { name: 'Ghi đè' }).click();
  const request = await overwrite;
  expect(request.postDataJSON().baseUpdatedAt).toBeUndefined();
  expect(JSON.stringify(request.postDataJSON())).toContain('Bản chỉnh sửa xung đột');
  await expect(dialog).toHaveCount(0);
});

test('undo after delete re-creates the element on the next save', async ({ page }) => {
  const pageA = makePage('page-a', 1, 'Phần tử sẽ bị xóa');
  const mock = await mockAdmin(page, [pageA]);

  await openEditor(page, 'page-a');
  page.on('dialog', (d) => d.accept());
  await openPanel(page, 'Lớp');
  await page.getByTitle('Xóa layer').first().click();
  await expect.poll(() => mock.deletes).toEqual(['text-page-a']);
  await expect(page.getByPlaceholder(TEXT_PLACEHOLDER)).toHaveCount(0);

  const resave = page.waitForRequest((req) => isSave(req, 'page-a'));
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  const body = (await resave).postDataJSON();
  const restored = body.elements.find((e: any) => e.id === 'text-page-a');
  expect(restored).toBeTruthy();
  expect(restored.type).toBe('TEXT');
  expect(restored.slot).toBe('body');
  expect(restored.data.text).toBe('Phần tử sẽ bị xóa');
  await expect.poll(() => mock.db.get('page-a')!.elements.map((e) => e.id)).toEqual(['text-page-a']);
});
