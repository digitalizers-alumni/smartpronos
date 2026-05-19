module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        'tribbo-bg': '#F7F8FC',
        'tribbo-surface': '#FFFFFF',
        'tribbo-primary': '#1D4DFF',
        'tribbo-text': '#1F2430',
        'tribbo-success': '#19C95B',
        'tribbo-error': '#FF3B43',
        'tribbo-gray-100': '#E8EAEF',
        'tribbo-gray-200': '#cbced4',
        'tribbo-gray-400': '#697086',
        'tribbo-gray-500': '#9CA3AF',
      },
      fontFamily: {
        archivo: ['"Archivo Black"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        space: ['"Space Mono"', 'monospace'],
      },
      borderRadius: {
        'tribbo-input': '0.75rem',
        'tribbo-card': '1rem',
        'tribbo-container': '1.25rem',
      },
      boxShadow: {
        'tribbo-sm': '0 1px 3px 0 rgba(0,0,0,0.06)',
        'tribbo-blue': '0 4px 14px 0 rgba(29,77,255,0.39)',
      },
    },
  },
  plugins: [],
};
