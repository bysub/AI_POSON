# Gap Detector Memory

## Project Structure
- Frontend views: `frontend/src/renderer/src/views/` (kiosk views at root, admin in `admin/`, kiosk subviews in `kiosk/`)
- KioskLayout is in `layouts/` not `views/` -- design docs often reference wrong path
- Locales: `frontend/src/renderer/src/locales/{ko,en,ja,zh}.json`
- Tailwind config: `frontend/tailwind.config.js`
- Admin settings: `frontend/src/renderer/src/views/admin/SettingsView.vue`

## Analysis History
- **kiosk-accessibility** (2026-02-20): Overall 62% match. Critical gap: CSS filter-based contrast vs design's CSS variable approach. Views never migrated to a11y-* Tailwind tokens. TTS/store/composable nearly 100%. ARIA attributes missing on MenuView interactive elements. Report at `docs/03-analysis/features/kiosk-accessibility.analysis.md`.

## Common Patterns
- Design docs often specify ideal CSS variable approach; implementation shortcuts with CSS filters
- Tailwind color tokens get defined but views don't migrate to use them (dead code pattern)
- ARIA attributes are frequently deferred during initial implementation
- TTS lifecycle hooks (onMounted speaks) are well-implemented; interactive TTS (on tap) often missing
