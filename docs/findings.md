# Adversarial findings and fixes

## 1. Report route rendered the investigation workspace

- **Symptom**: `/app/investigations/:id/report` showed the investigation page, and the Markdown/PDF actions were absent.
- **Cause**: TanStack file routing nested `app.investigations.$investigationId.report.tsx` under the investigation layout, which rendered no `<Outlet />`.
- **Fix**: renamed the file to `app.investigations.$investigationId_.report.tsx` to opt out of the parent layout. The URL is unchanged.
- **Evidence**: report page rendered with version, score, evidence, and a working Markdown download.

## 2. Missing D1 columns after schema evolution

- **Symptom**: investigation creation failed with `Failed query: insert into investigations`.
- **Cause**: `conclusion_justification` and `hypotheses.is_current` were added after the first migration was applied.
- **Fix**: generated and reviewed `20261104101840_military_gladiator.sql`, applied it, and re-tested.
- **Lesson**: any schema change requires `void db generate` and `void db migrate` before exercising the UI.

## 3. Model proposed Splunk syntax instead of KQL

- **Symptom**: first real analysis produced `search in (...) EventID==4104` and `| where`.
- **Cause**: the prompt said KQL but did not forbid SPL or pipelines.
- **Fix**: rule 10 now names Kibana KQL, forbids `|`, `search in`, `sourcetype=`, `index=` and SQL. `isLikelyKql` filters obvious SPL/SQL before persistence.
- **Evidence**: the next real analysis produced `host.name:WIN-FIN-042 AND network.transport:tcp` and `process.name:powershell.exe AND process.command_line:*EncodedCommand*`.

## 4. Initial analysis claimed a confirmed incident without imported evidence

- **Symptom**: initial output said “Incident confirmé” with 80% confidence from the alert alone.
- **Cause**: the model interpreted a high-severity alert as a conclusion.
- **Fix**: the prompt forbids definitive verdicts without imported results. The server also downgrades `confirmed_incident`, `false_positive` and `legitimate` to `undetermined` on an initial analysis with zero executed queries.
- **Evidence**: the next initial analysis returned “Non déterminé”, 0%, with explicit missing information.

## 5. Hydration mismatch between server and browser

- **Symptom**: React reported a text mismatch on “Bon après-midi” and dates.
- **Cause**: server timezone vs browser timezone, and `Date.now()` used during SSR.
- **Fix**: dates are formatted in UTC; relative timestamps render absolute UTC on the server and switch to relative after mount; the greeting is initialized as “Bonjour” and updated in an effect.
- **Evidence**: analyst dashboard and investigation loaded with zero console errors.

## 6. Mobile dashboard table overflowed

- **Symptom**: the recent investigations table was wider than the 390px viewport.
- **Fix**: the table is hidden under `md`, and a card list presents the same data.
- **Evidence**: premium UI audit at 390px reports 0 failures for the dashboard.

## 7. iOS zoom on fields

- **Symptom**: audit F5 flagged inputs and textareas under 16px on a phone.
- **Fix**: inputs, textareas and selects are forced to 16px under 640px. Primary buttons and fields are 44px tall on phones.
- **Evidence**: audit F5/X2 clear on the tested routes.

## 8. Report page horizontal scroll on phone

- **Symptom**: the report page had 691px of content in a 390px viewport.
- **Cause**: the timeline table's min-width escaped the grid track.
- **Fix**: `min-w-0` on report sections and the table wrapper, width containment on the article.
- **Evidence**: audit reports 0 failures and no sideways scroll at 390px.

## 9. Optical side bearings are encoded

- **Symptom**: the landing hero and the report title reported A4: the ink started 2-4px inside the box because of the font's side bearing.
- **Fix**: added `optical-043` for the landing hero and `optical-08` for the report title. The negative indent is part of the type utility, not a one-off margin.
- **Evidence**: premium UI audit reports 0 warnings on the landing and report at 1440x900 and 390x844.

## 10. The editorial dossier was itself the slop

- **Symptom**: the first premium pass replaced a generic dashboard with an editorial dossier: Instrument Serif, a numbered masthead, 9px mono labels and 4px control radii. The sign-in page was still a split marketing panel louder than the form. The owner called it slop again.
- **Cause**: the design system was applied as a style layer, not as the measured premium-react system. The composition was louder than the task.
- **Fix**: rebuilt around **Signal Room**, the premium-react measurements applied to the SOCIA brand: Geist everywhere, paper-white primary actions in dark, vermilion as a signal colour, a 256px sidebar, 36/40px controls, 8px control radii, 13/14/12px type, inline field errors, no serif, no numbered masthead, no split auth panel. The auth page is a centred 400px column. The dashboard is a KPI and table surface. The investigation is a tabbed case workspace with a context rail. The report is a print-ready document.
- **Evidence**: `docs/shots/` contains the rebuilt landing, login, dashboard, history, new investigation, investigation, report and settings at desktop and phone widths. The premium UI audit reports 0 FAIL and 0 WARN on every route at 1440x900 and 390x844, in dark and light, including the settings tabs. The report print view was checked visually.

## Verification

- `pnpm typecheck`: pass
- `pnpm lint`: 0 warnings, 0 errors
- `pnpm test`: 27 tests pass
- Premium UI audit: 48 checks on 12 routes at 1440x900 and 390x844, dark and light, with 0 FAIL and 0 WARN. Sign-in and sign-up add 8 checks, also 0 FAIL and 0 WARN. Off-grid spacing is 0% on the app routes; the landing is 2% and has no warning.
- Local model protocol: a mock Ollama server verified `/api/tags` detection, `/health.aiLocal`, the settings test, and an initial analysis with 10 KQL queries in one pass. A real Ollama model was not installed on this machine.
- Production: none. The Cloudflare Worker, both custom domains and the production D1 database were deleted after a JSON export. SOCIA now runs locally with `pnpm dev`, local D1 and Ollama.
- Roles: the local test account was promoted to admin only to audit `/app/settings`, then removed.
