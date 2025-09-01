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
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!window.disableAutoScroll) {
                window.scrollTo(0, 0);
            }
        }, 0);
    }, { once: true });
}

// Scroll pozisyonunu koru
const scrollX = window.scrollX;
const scrollY = window.scrollY;
setTimeout(() => {
    window.scrollTo(scrollX, scrollY);
}, 0);
