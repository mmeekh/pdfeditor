// Blog mobile menu handler

document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  const backdrop = document.getElementById('mobile-menu-backdrop');

  if (!menuBtn || !menu || !backdrop) return;

  // Populate menu links
  menu.innerHTML = `
    <nav class="space-y-4">
      <a href="/" class="block text-gray-600 hover:text-blue-600 transition">Ana Sayfa</a>
      <a href="/blog" class="block text-gray-600 hover:text-blue-600 transition">Blog</a>
      <a href="/about" class="block text-gray-600 hover:text-blue-600 transition">Hakkımızda</a>
      <a href="/contact" class="block text-gray-600 hover:text-blue-600 transition">İletişim</a>
    </nav>
  `;

  const openMenu = () => {
    menu.classList.add('show');
    backdrop.classList.add('show');
  };

  const closeMenu = () => {
    menu.classList.remove('show');
    backdrop.classList.remove('show');
  };

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.classList.contains('show')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  backdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
});
