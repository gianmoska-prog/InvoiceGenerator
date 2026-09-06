# Finishing and deployment verification — 7 September 2026

Started from `Moscatelli_InvoiceGenerator_COMPLETE.zip`. The existing HTML shell, CSS visual system, vanilla JavaScript state/rendering, local storage schema and html2pdf engine were retained. `docs/design-reference.png` remained the visual specification.

## Repairs

- Reference-based header/sidebar/column proportions, serif typography, warm ivory surfaces, oxblood accents and compact editor spacing. Delivery and secondary fields live in an expandable section.
- A4 previews use the same fixed page geometry at every viewport; mobile scales the full document. Accessible names identify collapsed navigation icons.
- Document number and Generate terminology track the selected type. Required information, dates, email, quantities, prices and VAT are validated. Displayed rounded line amounts reconcile with the subtotal.
- Paid dates, custom payment references and archive identities survive restoration. Re-saving a reopened archive updates the same record. Duplicate chooses an available reference. Draft saving flushes on leaving; storage failures are reported without crashing.
- Reproduced the original PDF offset/clipped-footer defect. Export now renders unscaled, explicitly positioned pages. Removed unsupported first-line typography from PDF rendering. Long documents repeat table headers and include actual page numbers.
- Send stops if export fails and clearly explains manual PDF attachment. No email backend or credentials were introduced.
- Bundled the pinned PDF dependency locally and used system fonts. The Pages workflow publishes only application assets.

## Browser checks

`qa.cjs` exercises 16 grouped checks in isolated Microsoft Edge sessions, on localhost and the actual GitHub Pages URL:

- All seven document types, terminology, generated/stale state, Draft/Issued/Paid/Void, Date Paid and date ordering.
- All five currencies; fractional quantities; rounded line totals, subtotal, tax and total; add/remove and required fields; party, notes, purpose and payment fields.
- Email validation; PDF download plus prepared mailto; failed-export handling. No email is transmitted.
- Immediate draft restoration, custom reference persistence, archive/save/open/update/delete, duplication and reset.
- One-page PDF and browser print; a 30-line document across three A4 pages with all rows retained.
- Widths 320, 390, 768, 1000, 1100, 1280 and 1448 pixels, without horizontal document overflow; mobile Edit/Preview, archive access, PDF and print.
- Unavailable local storage, JavaScript errors and failed application asset responses.

PDFs were rendered to images for visual inspection, including mobile, paid and multi-page output. Browser-print text was extracted to confirm all 30 line items. The final live page was opened in the Codex browser. GitHub Pages uses HTTPS and GitHub Actions deployment from `main`.

## Limits

- Drafts and archives are local to the browser and device; clearing storage deletes them.
- Send prepares the user's email application and requires manual PDF attachment.
- Download PDF is rasterized; browser Print / Save as PDF offers selectable text.
- Very long individual blocks/rows that exceed a page must be shortened; export validation explains this. Currency selection does not perform exchange-rate conversion.
- Dashboard, Clients and Products & Services are the original future-module placeholders.
- Mobile testing uses resized desktop browser viewports, not physical iOS/Android devices. Browser print settings can affect physical output.

During production automation, the local browser/network environment inserted an additional script absent from the repository and the direct HTTP response. Its fetch requests were cancelled during navigation. The audit records those separately; failures of application URLs still fail the audit.
