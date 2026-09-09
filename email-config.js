// Public OAuth client ID only. Never put a client secret, password or token here.
// Leave empty for Gmail compose + manual attachment. See docs/gmail-setup.md.
window.MOSCATELLI_EMAIL_CONFIG = Object.freeze({ googleClientId: '866393770239-jcfj24i846ins7l9df8buchcgu5k4ah2.apps.googleusercontent.com' });
// Load the small contacts/download extension before email.js and app.js initialise.
document.write('<link rel="stylesheet" href="contacts.css?v=contacts-1"><script src="contacts-bootstrap.js?v=contacts-1"><\/script>');
