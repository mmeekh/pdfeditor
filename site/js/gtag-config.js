window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Consent mode başlatma
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'functionality_storage': 'denied',
  'personalization_storage': 'denied',
  'security_storage': 'denied'
});

gtag('js', new Date());
gtag('config', 'G-XBF2E5K150', {
  'anonymize_ip': true,
  'allow_google_signals': false,
  'allow_ad_personalization_signals': false
});
