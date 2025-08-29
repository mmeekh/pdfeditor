/**
 * Global Scroll Management
 * Sadece F5 (reload) durumunda en üste çık; diğer etkileşimlerde asla dokunma
 */

// Reload tespiti (modern ve legacy API desteği)
const navEntry = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
const isReload = navEntry ? (navEntry.type === 'reload') : (performance.navigation && performance.navigation.type === 1);

if (isReload) {
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    // Sadece bu yüklemede en üste al
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.scrollTo(0, 0), 0);
    }, { once: true });
    window.addEventListener('load', () => {
        window.scrollTo(0, 0);
    }, { once: true });
}

console.log('Scroll Manager loaded - top only on reload');
