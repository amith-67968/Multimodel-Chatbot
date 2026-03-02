/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Neutral ChatGPT/Gemini-style palette
                neutral: {
                    850: '#1a1a1a',
                    950: '#0d0d0d',
                },
                surface: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#2a2a2a',
                    800: '#1e1e1e',
                    900: '#121212',
                },
                accent: {
                    DEFAULT: '#10a37f',
                    hover: '#0d8a6c',
                    light: '#1a7f64',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-dot': 'bounce-dot 1.4s infinite ease-in-out both',
                'fade-in': 'fade-in 0.3s ease-out forwards',
                'slide-up': 'slide-up 0.3s ease-out forwards',
            },
            keyframes: {
                'bounce-dot': {
                    '0%, 80%, 100%': { transform: 'scale(0)' },
                    '40%': { transform: 'scale(1)' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
