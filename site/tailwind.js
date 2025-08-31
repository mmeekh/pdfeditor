(function(){
  window.__twWarn = console.warn;
  console.warn = function(msg, ...args){
    if (typeof msg === 'string' && msg.includes('cdn.tailwindcss.com should not be used in production')) return;
    window.__twWarn.apply(console, [msg, ...args]);
  };
  document.write('<script src="https://cdn.tailwindcss.com"><\\/script>');
  document.write('<script>console.warn = window.__twWarn; delete window.__twWarn;<\\/script>');
})();
