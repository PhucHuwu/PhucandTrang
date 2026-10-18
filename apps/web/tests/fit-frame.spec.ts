import { test, expect, Page } from '@playwright/test';

// 2:1 landscape PNG.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8DwnwEIGAEABQMB/9wE7a0AAAAASUVORK5CYII=',
  'base64',
);
const baseImage = { id: 'img-test', type: 'IMAGE', zIndex: 1, visible: true, locked: false, opacity: 1, transform: { x: 0.2, y: 0.2, width: 0.5, height: 0.5, rotation: 0, scale: 1 }, style: { polaroidFrame: true }, data: { src: '/fit-test.png', caption: 'Đà Lạt', objectFit: 'contain' } };

async function fitAndSave(page: Page, rotation: number) {
  test.setTimeout(90000);
  const image = { ...baseImage, transform: { ...baseImage.transform, rotation } };
  const entry = { id: 'page-test', bookId: 'journal-test', pageNumber: 1, order: 1, side: 'right', title: 'Trang thử', elements: [image], background: { type: 'color', color: '#fff' } };
  const journal = { id: 'journal-test', title: 'Nhật ký', pages: [entry], settings: {}, cover: { front: { elements: [] } } };
  const saved: string[] = [];
  await page.route('**/fit-test.png', (route) => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('**/api/admin/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (req.method() !== 'GET' && req.postData()?.includes('"transform"')) saved.push(req.postData()!);
    let body: unknown = [];
    if (path.endsWith('/auth/me')) body = { authenticated: true, user: { id: 't', name: 'K', role: 'ADMIN' } };
    else if (path.endsWith('/journal')) body = journal;
    else if (path.includes('/pages/page-test')) body = entry;
    else if (path.includes('/pages')) body = [entry];
    else if (path.includes('/media')) body = { items: [], total: 0 };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/pages/page-test');
  await page.getByRole('button', { name: 'Lớp', exact: true }).click();
  await page.locator('.layer-row').first().click();
  await page.getByRole('button', { name: 'Thuộc tính', exact: true }).click();
  await page.getByRole('button', { name: 'Khớp khung với ảnh' }).click();
  await page.getByRole('button', { name: 'Đóng panel', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();

  await expect.poll(() => saved.length, { timeout: 15000 }).toBeGreaterThan(0);
  return JSON.parse(saved[saved.length - 1].match(/"transform":(\{[^}]*\})/)![1]);
}

test('fit frame to image shrinks the box around the photo and keeps its centre', async ({ page }) => {
  const t = await fitAndSave(page, 0);
  // Box 512×680: photo area 484 wide → 2:1 photo is 242 tall. Card = 512 × (242 + 28 padding + 38 caption) = 512 × 308.
  expect(t.width).toBeCloseTo(0.5, 3);
  expect(t.height * 1360).toBeCloseTo(308, 0);
  expect((t.y + t.height / 2) * 1360).toBeCloseTo(612, 0);
  expect(t.x).toBeCloseTo(0.2, 3);
});

test('fit frame keeps the visual centre of a rotated image', async ({ page }) => {
  const t = await fitAndSave(page, 30);
  // Konva rotates around the top-left: visual centre = top-left + R(θ)·(w/2, h/2).
  const centre = (x: number, y: number, w: number, h: number) => {
    const r = (30 * Math.PI) / 180;
    return [x + (w / 2) * Math.cos(r) - (h / 2) * Math.sin(r), y + (w / 2) * Math.sin(r) + (h / 2) * Math.cos(r)];
  };
  const [bx, by] = centre(0.2 * 1024, 0.2 * 1360, 512, 680);
  const [ax, ay] = centre(t.x * 1024, t.y * 1360, t.width * 1024, t.height * 1360);
  expect(ax).toBeCloseTo(bx, 0);
  expect(ay).toBeCloseTo(by, 0);
  expect(t.rotation).toBe(30);
});
