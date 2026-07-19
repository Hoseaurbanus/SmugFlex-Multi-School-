# Investigation Checklist — Detailed Prompts

Use this checklist to guide your investigation. For each category, complete all items before moving to the next.

---

## 1. Project Identity

- [ ] Read README.md (first 100 lines)
- [ ] Check package.json name/description fields
- [ ] Look for LICENSE file
- [ ] Check git log for activity pattern (recent commits? abandoned?)
- [ ] Identify project type (library, app, service, CLI tool, etc.)
- [ ] Note any "Work in Progress" indicators (TODO, WIP, HACK comments)

---

## 2. Tech Stack

- [ ] Read package.json for dependencies and devDependencies
- [ ] Check tsconfig.json or jsconfig.json for language version
- [ ] Identify framework (React, Vue, Express, etc.) from imports
- [ ] Check vite.config.ts/webpack.config.js for build tool version
- [ ] Look for .node-version, .nvmrc, or engines field
- [ ] Check for Python (requirements.txt, pyproject.toml, Pipfile)
- [ ] Check for Go (go.mod), Rust (Cargo.toml), or other languages
- [ ] Note package manager (npm, yarn, pnpm, bun)

---

## 3. Directory Structure

- [ ] List all top-level directories
- [ ] For each dir, identify purpose:
  - src/ — Source code
  - api/ — Backend API
  - public/ — Static assets
  - build/ — Build output
  - scripts/ — Utility scripts
  - database/ — DB schema/migrations
  - uploads/ — User uploads
  - assets/ — Design assets
- [ ] Check for nested structure patterns (feature-based, layer-based)
- [ ] Note any unusual directories (non-standard naming)

---

## 4. Entry Points

- [ ] Find main entry file (main.tsx, index.ts, app.ts, etc.)
- [ ] Check for CLI scripts in package.json "bin" field
- [ ] Look for API route definitions (routes/, api/, server/)
- [ ] Check index.html for SPA entry
- [ ] Identify public exports (index.ts barrel files)
- [ ] Note build output directory (dist/, build/, .next/)

---

## 5. Configuration

**TypeScript/JavaScript:**
- [ ] Read tsconfig.json — target, module, paths, strict settings
- [ ] Check for multiple configs (tsconfig.build.json, etc.)

**Linting/Formatting:**
- [ ] Check for .eslintrc, eslint.config.js
- [ ] Check for .prettierrc, prettier.config.js
- [ ] Check for .editorconfig

**Build Tools:**
- [ ] Read vite.config.ts — plugins, aliases, proxy settings
- [ ] Check for postcss.config.js, tailwind.config.js

**Environment:**
- [ ] Read .env.example — all expected variables
- [ ] Read .env.local (if exists) — actual values (check for secrets!)
- [ ] Check .gitignore for .env patterns

**CI/CD:**
- [ ] Check .github/workflows/ for GitHub Actions
- [ ] Check for .gitlab-ci.yml, Jenkinsfile, etc.
- [ ] Check vercel.json, netlify.toml, etc.

**Other:**
- [ ] Check .vscode/ for workspace settings
- [ ] Check .pre-commit-config.yaml
- [ ] Check .husky/ for git hooks

---

## 6. Core Modules

- [ ] Read all files in src/ (top-level)
- [ ] For each subdirectory in src/, identify purpose:
  - components/ — UI components
  - services/ — Business logic
  - utils/ — Utility functions
  - lib/ — Library wrappers
  - config/ — App configuration
  - contexts/ — React contexts
  - types/ — TypeScript types
  - test/ — Test files
- [ ] Check for shared modules vs domain-specific modules
- [ ] Note circular dependency risks (imports that loop)
- [ ] Identify module boundaries (what depends on what)

---

## 7. Data Flow

- [ ] Identify state management (Redux, Zustand, Context, etc.)
- [ ] Trace data from entry points through components
- [ ] Check for API call patterns (fetch, axios, etc.)
- [ ] Identify form handling (react-hook-form, formik, etc.)
- [ ] Check for event handling patterns
- [ ] Look for data transformation layers
- [ ] Identify caching strategies (React Query, SWR, etc.)

---

## 8. External Integrations

- [ ] Search for fetch/axios calls — list all external URLs
- [ ] Check for API keys in code (grep for API_KEY, SECRET, TOKEN)
- [ ] Identify database connections (prisma, mongoose, knex, etc.)
- [ ] Check for auth providers (Firebase, Auth0, Supabase, etc.)
- [ ] Look for file storage (S3, GCS, local uploads)
- [ ] Check for WebSocket connections
- [ ] Identify third-party SDKs in dependencies

---

## 9. Dependencies

**Production Dependencies:**
- [ ] List each with purpose:
  - What it does
  - Why it's needed
  - Version installed
- [ ] Check for unused packages (no imports found in codebase)
- [ ] Check for duplicate functionality (multiple packages doing same thing)

**Dev Dependencies:**
- [ ] List each with purpose
- [ ] Check for outdated packages
- [ ] Run npm audit (or check for known vulnerabilities)

**License Check:**
- [ ] Identify any GPL/AGPL dependencies (if project is proprietary)
- [ ] Note MIT/Apache/BSD (generally safe)

---

## 10. Testing

- [ ] Identify test framework (Jest, Vitest, Mocha, etc.)
- [ ] Find test configuration (jest.config, vitest.config, etc.)
- [ ] Locate test files (*.test.ts, *.spec.ts, __tests__/)
- [ ] Count test files vs source files
- [ ] Check for unit tests
- [ ] Check for integration tests
- [ ] Check for e2e tests (cypress, playwright, etc.)
- [ ] Check for test utilities and fixtures
- [ ] Look for coverage configuration
- [ ] Identify untested areas (source files without tests)

---

## 11. Security

- [ ] Grep for hardcoded secrets:
  - API keys (sk-, ak-, key_)
  - Passwords (password, passwd, secret)
  - Tokens (token, bearer)
  - Connection strings
- [ ] Check .env files are in .gitignore
- [ ] Verify authentication mechanisms
- [ ] Check input validation patterns
- [ ] Look for XSS vulnerabilities (dangerouslySetInnerHTML, etc.)
- [ ] Check SQL injection risks (raw queries, string concatenation)
- [ ] Verify CORS configuration
- [ ] Check CSP headers
- [ ] Look for sensitive data in logs
- [ ] Check file upload validation

---

## 12. Performance

- [ ] Check bundle size (build output)
- [ ] Look for lazy loading (React.lazy, dynamic imports)
- [ ] Check image optimization (next/image, sharp, etc.)
- [ ] Verify code splitting
- [ ] Check for large dependencies
- [ ] Look for unnecessary re-renders (React)
- [ ] Check database query patterns (N+1 queries, etc.)
- [ ] Verify caching strategies
- [ ] Check for memory leaks (event listeners, subscriptions)

---

## 13. Deployment

- [ ] Identify hosting platform (Vercel, Netlify, AWS, etc.)
- [ ] Read deployment scripts in package.json
- [ ] Check for Dockerfile
- [ ] Verify environment variables are configured
- [ ] Check CI/CD pipeline setup
- [ ] Look for health check endpoints
- [ ] Verify error tracking (Sentry, etc.)
- [ ] Check logging setup

---

## 14. Documentation

- [ ] Read README.md completely
- [ ] Check for inline code comments (are they helpful?)
- [ ] Look for API documentation (Swagger, OpenAPI, etc.)
- [ ] Check for architecture diagrams
- [ ] Look for CONTRIBUTING.md
- [ ] Check for CHANGELOG.md
- [ ] Verify setup instructions are accurate
- [ ] Check for JSDoc/TSDoc on public APIs

---

## 15. Pain Points

- [ ] Grep for TODO, FIXME, HACK, XXX, WORKAROUND
- [ ] Check for large files (>500 lines)
- [ ] Look for deeply nested code
- [ ] Identify copy-paste patterns
- [ ] Check for error handling gaps (empty catch blocks)
- [ ] Look for deprecated API usage
- [ ] Check for inconsistent patterns
- [ ] Identify tight coupling areas
- [ ] Look for missing abstractions
- [ ] Check for hardcoded values that should be configurable

---

## Completion Criteria

You have completed the investigation when:

- [ ] All 15 categories are checked off
- [ ] Every source file has been scanned
- [ ] Every config file has been read
- [ ] All dependencies have been reviewed
- [ ] All external integrations have been identified
- [ ] All security concerns have been flagged
- [ ] Report has been saved to docs/audits/
