# Moscatelli Invoice Generator

A static, production-oriented invoice and payment-document generator designed for MOSCATELLI. The interface follows the bespoke luxury financial-instrument concept supplied for the project: near-black navigation, ivory work surface, oxblood accents, editorial typography, and a live A4 document preview.

## Features

- Invoice, Payment Record, Quotation, Pro-forma, Expense Record, Purchase Order and Deposit Request modes
- Live A4 document preview
- Multiple dynamic line items
- Currency-aware monetary formatting (EUR, GBP, USD, CHF, BRL)
- Automatic subtotal, VAT/tax and total calculations
- Paid status and Date Paid handling
- Client/payee, Send To email and payment/reference fields
- Local draft auto-save
- Local archive with reopen/delete functionality
- PDF download via a locally bundled, pinned `html2pdf.js` dependency
- Consistent A4 pages on desktop, mobile, PDF and print, with continuation pages for long item lists
- Print-optimised A4 CSS
- Mail-client preparation workflow (browser security prevents silently attaching generated files)
- Responsive mobile Edit / Preview switching

## Structure

- `index.html` — application shell and semantic markup
- `styles.css` — full responsive visual system and print styling
- `app.js` — form state, calculations, preview rendering, PDF workflow and local archive
- `vendor/html2pdf.bundle.min.js` — pinned 0.10.1 client-side PDF engine and bundled dependencies
- `vendor/html2pdf-LICENSE.txt` — upstream license
- `qa.cjs` — development-only Playwright browser audit; not shipped to Pages
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow
- `.nojekyll` — prevents GitHub Pages/Jekyll processing

## Local use

Open `index.html` directly, or serve the folder with a simple static server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Live application: https://gianmoska-prog.github.io/InvoiceGenerator/

The project remains static HTML, CSS and vanilla JavaScript, with no build step or backend. Enable GitHub Pages with **GitHub Actions** as its source. Pushes to `main` run `.github/workflows/pages.yml`, which stages only the public application files and its local PDF dependency. All assets use relative paths. Typography uses Times/Arial system font families, removing third-party font requests.

## Gmail drafts

**Prepare email** generates the high-resolution invoice PDF and prepares a Gmail message for `gianmoska@gmail.com`. With the default configuration it downloads the PDF, opens Gmail compose, and explicitly asks you to attach the PDF and select Finance Department as sender. Retry and download links remain available if popups are blocked.

Optional Google authorisation enables automatic attachment and verified `Finance Department <finance@moscatelli.co>` drafts. Complete [the one-time setup](docs/gmail-setup.md). No email is sent by the app. Tokens stay in memory, with no client secret, backend or browser token storage. EN/PT/IT document and email language is selected in Delivery & Additional Details; user-entered text is preserved.

## Local storage

Drafts and archives are stored only in the current browser via `localStorage`. Clearing browser storage removes those records. A remote archive/authentication layer can be added later.

## Using the generator

- Edit the document on the left; the right-hand pages update automatically. On smaller screens use **Edit / Preview**.
- Open **Delivery & Additional Details** for Send To, Date Paid, document class, payment reference, account and authorisation. Selecting Paid opens these details automatically.
- Generate validates required parties, document reference, dates, email, line items and VAT. An edit returns the document to an ungenerated state; the selected Draft/Issued/Paid/Void status is preserved.
- The **•••** menu contains Print / Save as PDF, Open Archive, Save to Archive, Duplicate and Reset. The header archive shortcut also works on mobile.
- Archive Open restores a document for editing; Save updates that same record. Duplicate creates a separate draft with an available reference.

## PDF and print

The original HTML renderer and html2pdf engine are retained. Export now measures and paginates fixed A4 sheets, renders each through an unscaled, explicitly positioned export container, and places each complete image onto an A4 PDF page. This avoids the original offset/clipping defect and mobile zoom errors. Table headings repeat, rows stay together and page numbers reflect the full document. Browser print uses the same pages with application controls excluded.

Download PDFs use lossless PNG pages at 3750 × 5304 pixels (approximately 454 dpi), preserving sharper text and lines when zoomed. They remain raster documents; use **Print / Save as PDF** for selectable text. For browser print choose A4, 100% scale and disable browser headers/footers. Extremely long individual text blocks or single rows that cannot fit one page must be shortened; Generate reports this instead of silently exporting clipped content. Currency switching changes denomination/formatting only; it does not convert exchange rates.

## Audit

With Playwright available, run `node qa.cjs`. `TEST_URL` selects localhost or the live Pages URL, `TEST_OUTPUT` selects an output directory, and `PLAYWRIGHT_MODULE` can point to an existing Playwright installation. The script uses installed Microsoft Edge, isolated browser storage and test data. It covers document types, statuses, dates, currencies, monetary rounding, items, validation, draft restoration, archive identity, duplication/deletion, Send, PDF, print, 30-item pagination, responsive widths from 320 to 1448 pixels, and unavailable storage. The separate `node email-qa.cjs` audit tests Gmail preparation and mocked OAuth/API responses without transmitting email.

Dashboard, Clients and Products & Services remain the original clearly labelled future modules. This delivery completes the invoice/payment-document generator; it does not add a CRM or shared archive.

## Design reference and Codex hand-off

- `docs/design-reference.png` contains the approved visual target for the application.
- `CODEX_PROMPT.txt` is the recommended hand-off prompt for the finishing/deployment Codex run. The intended workflow is to refine this implementation rather than rebuild it.
