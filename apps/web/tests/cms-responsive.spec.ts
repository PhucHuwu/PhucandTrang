import { test, expect } from '@playwright/test';

const element = { id: 'text-test', type: 'TEXT', zIndex: 1, visible: true, locked: false, opacity: 1, transform: { x: 0.1, y: 0.2, width: 0.6, height: 0.2, rotation: 0, scale: 1 }, style: {}, data: { textLines: ['Nội dung cũ'], variant: 'body' } };
const entry = { id: 'page-test', bookId: 'journal-test', pageNumber: 1, order: 1, side: 'right', title: 'Trang thử nghiệm', elements: [element], background: { type: 'color', color: '#fff' } };
const journal = { id: 'journal-test', title: 'Nhật ký kiểm thử', pages: [entry], settings: {}, cover: { front: { elements: [element] } } };

test.beforeEach(async ({ page }) => {
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
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Menu quản trị' })).toBeVisible();
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

test('tools and save-layout dialog work on tablet and close with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/admin/pages/page-test');
  await expect(page.locator('.editor-workspace')).toBeVisible();
  await page.getByText('Công cụ', { exact: true }).click();
  await page.getByRole('button', { name: 'Lưu Template', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Lưu bố cục' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Lưu bố cục' })).toHaveCount(0);
});

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
