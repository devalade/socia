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

## 9. A4 optical warnings are accepted

The landing and investigation display headings report A4: the ink starts 2-4px inside the box because of the font's side bearing. Applying the suggested negative margin creates an A1 failure against the text below (the boxes no longer share an axis). We prioritise the shared axis and accept the A4 warning as an optical exception.

## 10. The first interface was a generic dark dashboard

- **Symptom**: the product used the premium primitives, but the composition was still a stock sidebar, KPI cards and rounded panels. The owner called it slop, correctly.
- **Cause**: the design system was applied at the component level, not at the page level. There was no direction, so every screen defaulted to the same dashboard template.
- **Fix**: rebuilt the product around **Ink & Signal**, an editorial dossier direction: Instrument Serif display, Geist UI, Geist Mono evidence, warm ink surfaces, a single vermilion accent, ruled columns, numbered exhibits, and no gradient or glow. The sidebar became a masthead with numbered navigation. The dashboard became a briefing sheet with a stat band, an activity chart and a docket ledger. The investigation became a case file with numbered exhibit tabs and a margin column. The landing became a front page with a masthead, a case plate, a sommaire and ruled spreads.
- **Evidence**: `docs/shots/` contains the landing, login, dashboard, history, new investigation, investigation, report and settings at desktop and phone widths. The premium UI audit reports 0 failures on every route at 1440x900 and 390x844.

## Verification

- `pnpm typecheck`: pass
- `pnpm lint`: 0 warnings, 0 errors
- `pnpm test`: 27 tests pass
- `pnpm build`: pass
- Premium UI audit: 0 failures on landing, login, dashboard, history, new investigation, investigation, report, settings at 1440x900 and 390x844. Remaining warnings: A4 optical side bearing on the landing hero, and two spacing warnings on history.
- Manual real-AI run: initial analysis, import, reanalysis, conclusion, report, Markdown download
- Production: `https://socia.devalade.me` deployed with Void, D1 migrations applied, Workers AI binding active, smoke passed. The temporary smoke account was removed; the remaining admin account is `me@devalade.me`.
- Roles: second account created as analyst; no Administration link, /app/settings redirects, no mutation controls on another analyst's investigation
