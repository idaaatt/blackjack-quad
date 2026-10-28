/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Casino felt palette
        felt: {
          900: '#051a12',   // deep shadow
          800: '#0a2b1c',   // base felt
          700: '#0d3d2e',   // main felt
          600: '#134d39',   // lighter felt
          500: '#1a6347',   // highlight felt
        },
        wood: {
          900: '#1a1006',
          800: '#2a1a0a',
          700: '#3d2710',
          600: '#5c3c18',
        },
        gold: {
          300: '#e8d48a',
          400: '#d4b95c',
          500: '#c8a94e',   // main gold accent
          600: '#a8892e',
          700: '#886918',
        },
        ivory: {
          50:  '#fdfcf8',
          100: '#f8f5ed',
          200: '#f0ead8',   // card face
          300: '#e8dfc4',
        },
        chip: {
          red:  '#c0392b',
          blue: '#2471a3',
          green:'#1e8449',
          black:'#2c3e50',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '2px 3px 8px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '4px 6px 16px rgba(0,0,0,0.6)',
        'felt': 'inset 0 2px 12px rgba(0,0,0,0.4)',
        'panel': '0 4px 20px rgba(0,0,0,0.5)',
        'gold-glow': '0 0 12px rgba(200,169,78,0.4)',
      },
      backgroundImage: {
        // Subtle felt texture via CSS — purpose: casino table identity
        'felt-texture': "radial-gradient(ellipse at 50% 0%, #134d39 0%, #0d3d2e 50%, #0a2b1c 100%)",
      },
      keyframes: {
        dealCard: {
          '0%': { transform: 'translateY(-60px) rotate(-6deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
        },
        chipFall: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        winFlash: {
          '0%, 100%': { boxShadow: '0 0 0 2px #c8a94e' },
          '50%': { boxShadow: '0 0 20px 4px #c8a94e' },
        },
        bustShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-4px)' },
          '40%': { transform: 'translateX(4px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'deal-card': 'dealCard 0.35s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
        'chip-fall': 'chipFall 0.25s ease-out forwards',
        'win-flash': 'winFlash 0.8s ease-in-out 2',
        'bust-shake': 'bustShake 0.4s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.25s ease-out forwards',
      },
    },
  },
  plugins: [],
};
