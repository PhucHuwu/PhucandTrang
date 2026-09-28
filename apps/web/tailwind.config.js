/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FDFBF7',
          100: '#F9F5EC',
          200: '#F3EAD6',
          300: '#E8D9BA',
          400: '#DEC49C',
        },
        rosewood: {
          50: '#FAF2F4',
          100: '#F5E3E7',
          200: '#E8BCC6',
          300: '#D58E9F',
          400: '#B6566D',
          500: '#94384F',
          800: '#4A1523',
          900: '#2F0B15',
        },
        ink: {
          900: '#1E1B18',
          800: '#2E2925',
          700: '#474039',
          600: '#645B51',
          500: '#8A7E71',
        },
        champagne: {
          400: '#E6C687',
          500: '#D4AF37',
          600: '#B89428',
        }
      },
      fontFamily: {
        serif: ['var(--font-cormorant)', 'Georgia', 'Cambria', 'serif'],
        handwriting: ['var(--font-alex-brush)', 'cursive'],
        script: ['var(--font-pinyon)', 'cursive'],
        sans: ['var(--font-montserrat)', 'sans-serif'],
      },
      boxShadow: {
        'book-deep': '0 25px 50px -12px rgba(25, 18, 14, 0.45), 0 0 0 1px rgba(212, 175, 55, 0.2)',
        'page-left': '-15px 0 25px -10px rgba(0,0,0,0.15), inset -2px 0 5px rgba(0,0,0,0.05)',
        'page-right': '15px 0 25px -10px rgba(0,0,0,0.15), inset 2px 0 5px rgba(0,0,0,0.05)',
        'polaroid': '0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
};
