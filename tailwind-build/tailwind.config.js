/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../site/**/*.html",
    "../site/js-v2/**/*.js",
  ],
  corePlugins: {
    preflight: false,  // match CDN behavior — site relies on this being off
  },
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    // Dynamically-generated color classes for Related Tools section
    {
      pattern: /(bg|text|border|hover:border)-(blue|purple|green|teal|indigo|red|orange|cyan|amber|emerald|slate)-(100|300|500|600|700)/,
    },
    // Animation/transform used by JS
    'scale-105', 'scale-110', 'rotate-90', 'rotate-180', 'rotate-270',
  ],
}
