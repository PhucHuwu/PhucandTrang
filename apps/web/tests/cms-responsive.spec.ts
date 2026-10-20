import { test, expect } from '@playwright/test';

const element = { id: 'text-test', type: 'TEXT', zIndex: 1, visible: true, locked: false, opacity: 1, transform: { x: 0.1, y: 0.2, width: 0.6, height: 0.2, rotation: 0, scale: 1 }, style: {}, data: { textLines: ['Nội dung cũ'], variant: 'body' } };
const entry = { id: 'page-test', bookId: 'journal-test', pageNumber: 1, order: 1, side: 'right', title: 'Trang thử nghiệm', elements: [element], background: { type: 'color', color: '#fff' } };
const journal = { id: 'journal-test', title: 'Nhật ký kiểm thử', pages: [entry], settings: {}, cover: { front: { elements: [element] } } };

test.beforeEach(async ({ page, baseURL }) => {
  // Passes the middleware's session-cookie UX guard; every API call is mocked below
  await page.context().addCookies([{ name: 'admin_access_token', value: 'test', url: baseURL! }]);
  await page.route('**/api/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (path.endsWith('/auth/me')) body = { authenticated: true, user: { id: 'test', name: 'Kiểm thử', role: 'ADMIN' } };
    else if (path.endsWith('/journal')) body = journal;
    else if (path.includes('/pages/page-test')) body = entry;
    else if (path.includes('/pages')) body = [entry];
    else if (path.includes('/media')) body = { items: [], total: 0 };
    else if (path.includes('/audio') || path.includes('/versions') || path.includes('/layout-templates')) body = [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
});

for (const viewport of [{ width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }, { width: 834, height: 1194 }, { width: 1194, height: 834 }, { width: 600, height: 900 }, { width: 375, height: 812 }]) {
  test(`tablet shell and editors ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of ['/admin', '/admin/media', '/admin/settings', '/admin/pages', '/admin/audio', '/admin/layout-templates', '/admin/versions', '/admin/pages/page-test', '/admin/cover']) {
      await page.goto(path);
      await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
      // In dev mode the button can render before hydration attaches handlers, so retry the click.
      await expect(async () => {
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Menu quản trị' })).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15000 });
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Menu quản trị' })).toHaveCount(0);
      if (path.includes('page-test') || path.endsWith('/cover')) {
        await expect(page.locator('.editor-workspace')).toBeVisible();
        await page.getByRole('button', { name: 'Thuộc tính', exact: true }).click();
        await expect(page.locator('.editor-properties')).toBeVisible();
        await page.getByRole('button', { name: 'Đóng panel', exact: true }).click();
        await expect(page.locator('.editor-properties')).toBeHidden();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`${path.replaceAll('/', '_')}.png`) });
    }
  });
}

test('existing text edits clear legacy lines and accept empty content', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto('/admin/pages/page-test');
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await page.getByRole('button', { name: 'Thuộc tính', exact: true }).click();
  const input = page.getByPlaceholder('Nhập nội dung chữ hoặc chèn biến động...');
  await expect(input).toHaveValue('Nội dung cũ');
  await input.fill('Nội dung mới');
  await expect(input).toHaveValue('Nội dung mới');
  await input.fill('');
  await expect(input).toHaveValue('');
});

test('save-layout dialog works on tablet and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/admin/pages/page-test');
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await page.getByRole('button', { name: 'Lưu Template', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Lưu bố cục' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Lưu bố cục' })).toHaveCount(0);
});

for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`page editor chrome stays compact ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/admin/pages/page-test');
    await expect(page.locator('.editor-workspace')).toBeVisible();
    const header = await page.locator('.editor-header').boundingBox();
    const toolbarBottom = await page.locator('.editor-canvas').evaluate((el) => el.getBoundingClientRect().top);
    const shellTop = await page.locator('.page-editor').evaluate((el) => el.getBoundingClientRect().top);
    expect(header!.height).toBeLessThanOrEqual(viewport.width < 560 ? 112 : 64);
    expect(toolbarBottom - shellTop).toBeLessThanOrEqual(viewport.width < 640 ? 220 : 130);
    for (const name of ['Đổi bố cục', 'Thêm ảnh', 'Hoàn tác', 'Vừa vùng làm việc']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(36);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('tapping outside an overlay panel closes it', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/admin/pages/page-test');
  await page.getByRole('button', { name: 'Lớp', exact: true }).click();
  await expect(page.locator('.editor-layers')).toBeVisible();
  await page.mouse.click(740, 900);
  await expect(page.locator('.editor-layers')).toBeHidden();
});

test('layout picker is reachable from the page header', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/admin/pages/page-test');
  await page.getByRole('button', { name: 'Đổi bố cục', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Chọn bố cục' })).toBeVisible();
});

for (const viewport of [{ width: 375, height: 812 }, { width: 1024, height: 768 }]) {
  test(`editor dialogs cover the header and close ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/admin/pages/page-test');
    await page.locator('.editor-workspace').waitFor();
    for (const [button, name] of [['Đổi bố cục', 'Chọn bố cục'], ['Lưu Template', 'Lưu bố cục'], ['Lịch sử phiên bản', 'Lịch sử phiên bản']]) {
      await page.getByRole('button', { name: button, exact: true }).click();
      const dialog = page.getByRole('dialog', { name });
      await expect(dialog).toBeVisible();
      // Dialog sits above the editor header: the top-left corner hit-tests inside the dialog.
      expect(await dialog.evaluate((d) => d.contains(document.elementFromPoint(4, 4)))).toBe(true);
      const box = (await dialog.locator('.cms-dialog-panel').boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
      await expect(dialog.getByRole('button', { name: 'Đóng', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Đổi bố cục', exact: true }).click();
    await page.mouse.click(viewport.width - 2, 2);
    if (viewport.width >= 640) await expect(page.getByRole('dialog', { name: 'Chọn bố cục' })).toHaveCount(0);
  });
}

test('rotation retains edited text and selected properties panel', async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto('/admin/pages/page-test');
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await page.getByRole('button', { name: 'Thuộc tính', exact: true }).click();
  const input = page.getByPlaceholder('Nhập nội dung chữ hoặc chèn biến động...');
  await input.fill('Giữ nguyên khi xoay');
  await page.setViewportSize({ width: 1194, height: 834 });
  await expect(input).toHaveValue('Giữ nguyên khi xoay');
  await expect(page.locator('.editor-properties')).toBeVisible();
});
