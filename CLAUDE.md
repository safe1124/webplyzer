# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Webplyzer is a Next.js 15 App Router application for batch WebP conversion. Users upload JPG/JPEG/PNG files (up to 25), reorder them via drag-and-drop, and convert them to WebP format with sequential numbering. Single files download directly; multiple files are zipped client-side.

**Tech Stack:**
- Next.js 15 (canary) with App Router + TypeScript (strict mode)
- React 19 RC with hooks-based components
- Tailwind CSS for styling, `clsx` for conditional classes
- `sortablejs` for drag-and-drop reordering
- `sharp` for server-side WebP conversion (Node runtime)
- `jszip` for client-side ZIP generation

**Node.js Requirement:** 18.18+ (specified in `package.json` engines and `.nvmrc`)

## Development Commands

### Essential Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server with Turbopack (http://localhost:3000)
npm run build        # Production build with Webpack (Turbopack not supported in canary.57)
npm run start        # Start production server
npm run lint         # Run ESLint (next lint)
```

### Before Committing

Always run:

```bash
npm run lint         # Must pass with no errors
npm run build        # Must complete successfully
```

### Manual Testing Checklist

No automated tests exist. Before creating a PR, verify:

- Single image conversion → WebP downloads correctly
- Multiple images + reorder → ZIP file order matches UI
- Invalid file type (e.g., `.gif`) → Error message displays
- Locale switching (JA/EN/KO) → UI text updates correctly

## Architecture & Key Files

### App Router Structure (`app/`)

- **`app/page.tsx`** (369 lines): Main UI component with file upload, drag-and-drop reordering (SortableJS), locale switching, conversion logic, and progress tracking. All frontend state (`useState`) and effects (`useEffect`) are here.
- **`app/layout.tsx`**: Root layout with metadata and globals.css import.
- **`app/globals.css`**: Tailwind directives, custom scrollbar styles, and theme colors.
- **`app/api/convert/route.ts`**: WebP conversion API endpoint (Node runtime). Accepts `FormData` with `base_name`, `file_index`, and `files`. Returns single WebP or ZIP of multiple WebPs. Uses `sharp` for conversion (quality 90, EXIF rotation).

### Libraries (`lib/`)
- **`lib/sanitizeFilename.ts`**: Exports `sanitizeFilename()` (removes dangerous characters), `ALLOWED_EXTENSIONS` (`.jpg`, `.jpeg`, `.png`), and `MAX_FILES` (25). Used by both client and server.
- **`lib/i18n.ts`**: Translation strings for JA/EN/KO locales. Keys map to UI messages (errors, labels, buttons).

### Configuration
- **`next.config.mjs`**: Enables `typedRoutes` and `optimizePackageImports` for SortableJS. ESLint runs on `app`, `components`, `lib`.
- **`tsconfig.json`**: Strict TypeScript with `@/*` path alias pointing to root.
- **`tailwind.config.ts`**: Defines `brand` colors (blue/green/yellow/red) used throughout UI.

### Key Architectural Patterns
1. **Client-Server Separation**: Image conversion happens server-side (Node runtime required for `sharp`). Client handles file selection, reordering, progress tracking, and ZIP generation.
2. **Sequential Conversion**: Client sends files one-by-one to `/api/convert` with `file_index` to maintain order. Server validates extension, converts to WebP, returns buffer.
3. **Dynamic Locale Management**: `useState` holds current locale (`ja`/`en`/`ko`). All UI text looks up translations from `lib/i18n.ts`.
4. **Error Handling**: API returns JSON `{ error: "code" }` for validation failures. Client translates error codes to localized messages.

### Critical Constraints
- **MAX_FILES = 25**: Enforced in `lib/sanitizeFilename.ts`, validated server-side.
- **Node Runtime Required**: `export const runtime = "nodejs"` in API route. Edge Runtime does NOT support `sharp`.
- **No Persistent Storage**: Files are processed in-memory and discarded after response.
- **Filename Sanitization**: Applied to `base_name` on both client and server to prevent directory traversal.

## Coding Standards

### TypeScript
- Strict mode enabled (`tsconfig.json`). All code must type-check.
- Use `@/*` imports (e.g., `@/lib/sanitizeFilename`) for cleaner paths.
- Avoid `any`; prefer `unknown` or specific types.

### React Components
- Function components with hooks only (no class components).
- Use `useEffect` for side effects, `async/await` for async operations.
- Keep state in `useState`; avoid global state unless necessary.

### API Routes
- Always specify `export const runtime = "nodejs"` for routes using `sharp`.
- Use Web standard `Response` for binary data (not Next.js-specific helpers).
- Return JSON errors with appropriate status codes (400/500).

### Styling
- Tailwind utility classes directly in JSX.
- Complex class logic uses `clsx` for readability.
- Theme colors: Use `brand-*` tokens from `tailwind.config.ts`.

### File Naming
- Components: PascalCase (e.g., `FileUploadCard.tsx`)
- Utilities: camelCase (e.g., `sanitizeFilename.ts`)
- API routes: lowercase (e.g., `convert/route.ts`)

## Common Development Tasks

### Adding a New Locale
1. Edit `lib/i18n.ts`: Add new locale key and translate all strings.
2. Update `app/page.tsx`: Add new locale to `Locale` type and locale picker UI.
3. Test all UI screens with new locale selected.

### Modifying Conversion Logic
1. Edit `app/api/convert/route.ts` to adjust `sharp` options (quality, format, etc.).
2. Update `docs/specs/spec.md` if constraints change (e.g., quality level).
3. Run manual tests for single/multiple file conversions.

### Adding New File Type Support
1. Add extension to `ALLOWED_EXTENSIONS` in `lib/sanitizeFilename.ts`.
2. Verify `sharp` supports the format (check Sharp docs).
3. Update validation logic in `app/api/convert/route.ts` if needed.
4. Document change in `docs/specs/spec.md`.

### Extracting Components from `app/page.tsx`
Current UI is monolithic (369 lines). To extract:
1. Create `components/` directory if not exists.
2. Move reusable logic (e.g., `FileCard`, `ProgressBar`) to separate files.
3. Import into `page.tsx` using `@/components/*` path.
4. Maintain hooks (`useState`, `useEffect`) in parent or pass via props.

## Deployment & Runtime

### Vercel Deployment
- Uses `npm run build` script (Turbopack).
- `sharp` installs native binaries automatically during Vercel build.
- API routes run on Node runtime (Serverless Functions).
- No additional environment variables required.

### Local Production Testing
```bash
npm run build
npm run start
# Visit http://localhost:3000
```

### Known Issues

- **Turbopack Build Support**: Next.js 15.0.0-canary.57 does NOT support `next build --turbo`. Production builds use Webpack. Only `next dev --turbo` is supported for development.
- **canary Releases**: Breaking changes may occur. Pin versions in `package.json` if stability is critical.

## Documentation & Knowledge Base

### Documentation Strategy

All project knowledge lives in `docs/` (single source of truth). When adding/updating knowledge:

1. Edit appropriate file in `docs/` (or create new file using `kebab-case.md`).
2. Update `docs/index.md` index with new links/changes.
3. Use `DOC:` commit prefix for documentation changes.

### Key Documents

- **`docs/index.md`**: Documentation hub and update rules.
- **`docs/specs/spec.md`**: Product requirements, system constraints, feature definitions.
- **`docs/dev/branch.md`**: Branch strategy, commit conventions, PR templates.
- **`AGENTS.md`**: Contributor guidelines (module organization, coding style, testing).
- **`README.md`**: User-facing setup and feature overview.

### When to Update Docs

- **Specs Change**: Update `docs/specs/spec.md`.
- **New Architecture Pattern**: Update `AGENTS.md` or create new doc in `docs/dev/`.
- **Branch/CI Flow Change**: Update `docs/dev/branch.md`.
- **New Knowledge Category**: Create new file, link in `docs/index.md`.

## Branch & Commit Workflow

### Branch Naming

```text
<type>/<short-description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`

Example: `feat/quality-slider`, `fix/zip-filename`, `docs/api-guide`

### Commit Message Format

```text
<type>: <summary>
```

Example: `feat: add image quality selector`, `fix: preserve EXIF orientation`

### Pull Request Requirements

- **Title**: Same format as commit (`<type>: <summary>`)
- **Description**: Include:
  - Bullet-point summary of changes
  - Manual test checklist (single file, multiple files, locale switch, error cases)
  - Screenshots/GIF for UI changes
  - Confirmed locales if translations updated
- **Before Merge**: Rebase on `main` (`git pull --ff-only origin main && git rebase main`)
- **After Merge**: Delete remote and local branches

## Tips for AI Agents

### Context Gathering

- **Start with**: `docs/index.md` → `docs/specs/spec.md` → `AGENTS.md`
- **UI Logic**: Read `app/page.tsx` (all frontend state/effects are here)
- **API Logic**: Read `app/api/convert/route.ts` (conversion + validation)
- **Shared Utils**: Check `lib/sanitizeFilename.ts` and `lib/i18n.ts` first

### Common Pitfalls

- **Don't use Edge Runtime**: API route MUST use Node runtime for `sharp`.
- **Don't skip sanitization**: Always sanitize `base_name` on client AND server.
- **Don't exceed MAX_FILES**: Validate file count before upload and in API.
- **Don't forget locale testing**: Test all three locales (JA/EN/KO) after UI changes.

### Making Changes

1. Read relevant files first (use `@/*` imports to find dependencies).
2. Check `docs/specs/spec.md` for constraints before modifying logic.
3. Run `npm run lint && npm run build` before committing.
4. Update `docs/` if architectural or constraint changes occurred.
5. Follow manual test checklist before creating PR.

## Final Notes

- This project uses **canary releases** of Next.js 15 and React 19. Expect occasional breaking changes.
- **Node.js 18.18+** is mandatory (specified in `.nvmrc`).
- **No automated tests** exist. Manual testing is required for all changes.
- **All knowledge must be documented** in `docs/` per project conventions.
