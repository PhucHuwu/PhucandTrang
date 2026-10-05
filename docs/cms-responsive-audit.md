# CMS responsive audit

Scope: source inspection of admin shell, dashboard, pages, cover, media, audio, layouts, settings, versions, login, preview and shared admin dialogs. No browser viewport or touch testing was performed. Findings below are code-confirmed risks, not measured screenshots.

## High priority

1. **Admin shell has no mobile navigation state.** `apps/web/src/components/admin/AdminSidebar.tsx:74` uses a permanently visible `w-64 shrink-0` sidebar. `apps/web/src/app/admin/layout.tsx:26-30` does not provide a drawer or collapse breakpoint and omits `min-w-0` on the content column. At narrow widths the sidebar consumes 256px before content. Rules: R-03, R-24.
2. **Nested full-screen editors exceed their available height.** `apps/web/src/app/admin/layout.tsx:26-30` reserves a header within a full-screen shell, while page editor uses `h-[100dvh]` and cover uses `h-screen` (`apps/web/src/app/admin/cover/page.tsx:462`). Editors should size to the available content height, not add a second viewport. Rules: R-03.
3. **Cover Studio retains desktop-only columns.** `apps/web/src/app/admin/cover/page.tsx:464,582,708` has a fixed-height non-wrapping toolbar, layers panel and 320px properties panel. Unlike the page editor, it has no narrow-screen panel switcher. Rules: R-03.
4. **Version history loses functionality on phones.** `apps/web/src/components/admin/VersionHistoryModal.tsx:319` hides the details pane with `hidden sm:flex`. The rollback control resides in this pane, making it inaccessible below 640px. Reflow the pane or provide list/detail navigation. Rules: R-03, R-26.
5. **Preview uses viewport width inside the admin shell.** `apps/web/src/app/admin/preview/page.tsx:105,114,132` uses `w-screen h-screen` despite being a child of the sidebar/header layout. It should be a dedicated full-screen route layout or use available width and height. Rules: R-03.

## Medium priority

6. **Admin header does not wrap.** `apps/web/src/components/admin/AdminHeader.tsx:12-22` combines fixed 64px height, 48px horizontal padding, an admin badge and action group. Hiding some labels does not resolve the permanently wide sidebar. Rules: R-03.
7. **Page editor breakpoints use viewport rather than remaining workspace width.** The `xl` three-column state adds 256px layers and 320px inspector to a shell already containing a 256px sidebar. At 1280px only roughly 448px remain for canvas before padding. Tablet properties mode also reserves 320px. Verify based on workspace width after repairing the shell. Rules: R-03.
8. **Page editor toolbar can consume much of a short screen.** Wrapped tools, large touch targets and full-height editor need a compact primary-action row plus secondary controls. Also make the title row and canvas labels fit at 320px. Rules: R-03.
9. **Page editor empty-selection hint appears inside metadata mode.** Its condition is `inspectorTab !== 'background' && !selectedElement`; metadata controls are page-level and should not display this unrelated hint. It wastes scarce vertical space. Rules: R-03, R-27.
10. **Settings and layout-template headers cannot reflow.** `apps/web/src/app/admin/settings/page.tsx:227` and `apps/web/src/app/admin/layout-templates/page.tsx:151` use non-wrapping `flex items-center justify-between` for heading/actions. Playlist rows also combine title, artist and order badge without adequate shrinking (`settings/page.tsx:859`). Rules: R-03.
11. **Media grid is too dense before shell width is accounted for.** `apps/web/src/app/admin/media/page.tsx:258` switches to 4 columns at md and 6 at lg based on viewport. The sidebar reduces actual card width significantly; use workspace-aware columns/minimum card widths. Rules: R-03.
12. **Dialog height/scroll behavior is inconsistent.** `SaveAsLayoutModal.tsx:87` lacks viewport max-height and internal scrolling. `AdvancedVideoEditor.tsx:363` has similar constraints. `VersionHistoryModal.tsx:154` uses `85vh`, not dynamic viewport sizing. Check short landscape screens and open virtual keyboards. Rules: R-03, R-35.
13. **Touch targets are generally smaller than 44px outside page editor.** Header links, sidebar links, modal close buttons, layer action icons and media controls often use small padding around 12-20px icons. The page-editor-local style does not fix other CMS screens. Rules: R-03, R-32.

## Existing responsive provisions

- Dashboard, audio, versions and layout-template grids have column breakpoints.
- Page list table is contained in `overflow-x-auto` (`pages/page.tsx:274`); table scrolling itself is intentional.
- Settings tab strip permits local horizontal scrolling.
- Login uses full width, outer padding and a constrained form.
- Media/Layout pickers constrain modal width and have responsive grids.

These provisions still require browser checks after the shell is fixed. They are not a declaration that those screens pass.

## Verification matrix for repair

Use 320, 375, 768, 1024, 1280 and 1440px widths, plus short landscape height. Check: no page-level horizontal overflow; reachable navigation and logout; save/publish remain reachable; list/detail and rollback work on phones; canvas fits without clipping at default zoom; intentional zoom/table scrolling stays inside its own region; dialogs scroll with a keyboard open; keyboard focus stays visible; touch targets are at least 44px.

Repair order: shell/navigation, route heights and preview isolation, cover editor, history dialogs, headers/grids, touch targets. Browser verification remains pending.
