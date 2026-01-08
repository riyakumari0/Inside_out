/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'sage-green': '#7D8C71',
                'sage': {
                    'light': '#A3B087',
                    'DEFAULT': '#7D8C71',
                    'dark': '#556948',
                },
                'off-white': '#F9F9F9',
                'charcoal': '#333333',
            },
            fontFamily: {
                'script': ['"Great Vibes"', 'cursive'],
                'sans': ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
