# One-time Gmail authorisation

The deployed default works without Google setup: Prepare email downloads the PDF and opens Gmail compose for gianmoska@gmail.com. Attach the downloaded PDF and select Finance Department manually. Compose links cannot force the From identity or attach files.

To enable automatic PDF attachments:

1. Open Google Cloud Console using your account. Create/select a project and enable **Gmail API**.
2. In Google Auth Platform, configure the consent screen. For personal use choose External / Testing and add **gianmoska@gmail.com** as the test user. Add scopes `https://www.googleapis.com/auth/gmail.compose` and `https://www.googleapis.com/auth/gmail.settings.basic`.
3. Create an OAuth client of type **Web application**. Add the authorised JavaScript origin **https://gianmoska-prog.github.io** (origin only, without /InvoiceGenerator/). Optionally add http://localhost:8000 for development. The popup token flow needs no redirect URI.
4. Copy only the **public Client ID** ending in `.apps.googleusercontent.com` into `googleClientId` in `email-config.js`. Commit to main and allow Pages to deploy. Never put a client secret, access token, refresh token, Gmail password or Migadu password in this project or chat.
5. On the live app, click **Connect Gmail**, choose **gianmoska@gmail.com**, and grant consent. The app checks that account and confirms finance@moscatelli.co is an accepted Send mail as alias. No SMTP configuration is changed.
6. Prepare a test invoice. Confirm the draft appears in the correct account with **Finance Department <finance@moscatelli.co>** as From, the correct recipient and a readable attached PDF. Review or discard it yourself. The app never sends it.

The browser-only Google Identity Services token model keeps short-lived access tokens in memory and requests consent through Google. Reauthorisation is needed after expiry or a page reload; disconnect clears the in-memory token. No refresh tokens or client secrets are used. Google may require additional consent-screen verification for publishing beyond personal test users. The compose scope technically permits sending, although this application's only message-writing call is **users.drafts.create**; Gmail offers no narrower draft-creation scope. The settings scope is used only to read the verified sender alias.

PDF attachments are limited to 10 MB. Account/alias mismatches stop uploads. Failed or uncertain requests retain the PDF; after an uncertain creation, check Drafts before making another attempt. Repeated clicks reuse the same preparation while the page remains open. On mobile or if a specific-draft link fails, use **Open Gmail Drafts**. Popup-blocked users can use the visible retry link.

This update was deployed without runtime tests at the owner's request. Real account consent, sender verification and attachment read-back require completing the steps above and remain unverified.

References: [Google browser token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Gmail draft creation](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.drafts/create).
