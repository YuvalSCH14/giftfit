# Browser checks

Two Playwright scripts that drive the app like a phone user. They need the `playwright`
package and a Chromium it can launch (not a project dependency).

```
ADMIN_EMAILS=boss@example.com ADMIN_SETUP_CODE=dev-code npm run dev -- --port 5173 --strictPort
node e2e/core.cjs <screenshot-dir> [base-url]   # questionnaire, results, details, stores, favorites
node e2e/accounts.cjs <screenshot-dir> [base-url]   # accounts, reviews, reminders, catalog manager
```

`accounts.cjs` expects a freshly started dev server (the in-memory database must be empty).
