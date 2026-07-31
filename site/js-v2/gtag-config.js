window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Consent varsayılanını kullanıcının tercihini dikkate alarak ayarla
const storedConsent = localStorage.getItem('cookieChoice');
const consentDefaults = storedConsent === 'accepted' ? {
  'analytics_storage': 'granted',
  'ad_storage': 'granted',
  'ad_user_data': 'granted',
  'ad_personalization': 'granted',
  'functionality_storage': 'granted',
  'personalization_storage': 'granted',
  'security_storage': 'granted'
} : storedConsent === 'rejected' ? {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'functionality_storage': 'denied',
  'personalization_storage': 'denied',
  'security_storage': 'denied'
} : {
  // Varsayılan: ölçüm çalışsın, reklam/kişiselleştirme kapalı kalsın
  'analytics_storage': 'granted',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'functionality_storage': 'granted',
  'personalization_storage': 'denied',
  'security_storage': 'granted'
};

gtag('consent', 'default', consentDefaults);

// 2026-07-31: gtag('config') KALDIRILDI — GA4 yapılandırması artık yalnız GTM'de
// (container'a GA4 etiketi eklendi; buradaki config çift page_view sayımına yol açıyordu).
// Bu dosya yalnızca consent default + gtag() tanımı sağlar ve GTM'den ÖNCE yüklenmelidir.
