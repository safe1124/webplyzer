# Repository Guidelines

## Project Structure & Module Organization
- `app.py` contains the Flask entrypoint, routes, and conversion logic; keep helper functions near their route usage to maintain clarity.
- `templates/index.html` houses the upload UI—extend existing data hooks instead of adding inline handlers to keep translations aligned.
- `static/style.css` controls layout and color tokens; reuse the utility classes already defined before introducing new rules.
- `translations/<locale>/LC_MESSAGES/messages.po|.mo` store localized copy compiled via Babel; rerun extraction whenever template strings change.
- Runtime artifacts live in `/tmp` via `UPLOAD_DIR`; leave `uploads/` for local experiments only and keep it git-clean.

## Build, Test, and Development Commands
- Provision dependencies in an isolated shell:
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```
- Start the app locally (debug reload + explicit host): `FLASK_DEBUG=1 python app.py`
- Regenerate locale catalogs after string edits:
```bash
pybabel extract -F babel.cfg -o messages.pot .
pybabel update -i messages.pot -d translations
pybabel compile -d translations
```

## Coding Style & Naming Conventions
- Follow PEP 8 with 4-space indentation; prefer descriptive `snake_case` functions and reserve `PascalCase` for classes.
- Keep module-level constants uppercase (`ALLOWED_EXTENSIONS`) and document non-trivial helpers with short docstrings.
- Use kebab-case IDs/classes in templates to match `static/style.css`, and favor semantic HTML with data attributes for JS wiring.

## Testing Guidelines
- Perform a manual smoke pass per PR: single-image conversion, multi-file ZIP download, and locale switching (JA/EN/KO).
- Introduce `pytest` when adding automation; mirror module names (`tests/test_convert.py`) and run with `pytest -q` under an activated venv.

## Commit & Pull Request Guidelines
- Write imperative, scoped commits such as `feat: support custom quality slider` or `fix: sanitize unicode filenames`.
- PRs should detail user impact, list verification steps, and include UI screenshots/GIFs when altering layout or copy.
- Link issues, request translation review for string updates, and confirm `/tmp` cleanup logic in manual test notes.

## Deployment Notes
- Vercel relies on `vercel.json` to dispatch `app.py`; keep the entrypoint fast and gate auxiliary scripts behind `if __name__ == "__main__"`.
- Validate production parity with `vercel dev` before merging changes that touch dependencies or file-system access patterns.

## Documentation & Knowledge Base

本プロジェクトにおける知見・ルールは `docs/` を唯一のソース・オブ・トゥルース（SoT）とします。エージェントや開発者が得た知見は、適切な `docs/` 配下の Markdown に追記、または新規作成し、索引である `docs/index.md` を必ず更新します。

## 基本方針
- ルール/知見は `docs/` に集約。
- 変更時は `docs/index.md`（索引・運用ルール）を更新。
- ドキュメントコミットは `DOC:` プレフィックス。
- 機密情報（PII等）は `docs/` に保存しない。

## 運用フロー（PDCA）
1. PLAN: `docs/index.md` で既存配置と命名を確認。
2. DO: 該当 `docs/` ファイルを更新 or 新規作成。必要に応じてカテゴリディレクトリ追加。
3. CHECK: リンク切れ/重複/命名不整合が無いか確認。
4. ACTION: 運用改善点や不足ルールをドキュメント化。

## 命名・配置ガイド
- ファイル名は `kebab-case.md`、目的が明確な名前。
- 1ファイルが 300 行超 or 技術領域が分岐 → 分割/ディレクトリ化。
- 代表例：
  - `docs/coding-standards.md`（規約）
  - `docs/import-path-migration.md`（移行ガイド）
  - `docs/dev/branch.md`（ブランチ/CI）
  - `docs/FRONTEND_IMPROVEMENTS.md`（改善メモ）

## 索引（参照）
- ドキュメントのエンドポイント: `docs/index.md`
- ブランチ戦略: `docs/dev/branch.md`
