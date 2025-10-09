/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(220, 85%, 57%)", // Aviation blue
          foreground: "hsl(0, 0%, 98%)",
          50: "hsl(220, 85%, 97%)",
          100: "hsl(220, 85%, 93%)",
          200: "hsl(220, 85%, 83%)",
          300: "hsl(220, 85%, 73%)",
          400: "hsl(220, 85%, 63%)",
          500: "hsl(220, 85%, 57%)",
          600: "hsl(220, 85%, 45%)",
          700: "hsl(220, 85%, 38%)",
          800: "hsl(220, 85%, 30%)",
          900: "hsl(220, 85%, 20%)",
        },
        secondary: {
          DEFAULT: "hsl(210, 40%, 90%)",
          foreground: "hsl(220, 85%, 15%)",
        },
        aviation: {
          light: "hsl(220, 85%, 65%)",
          DEFAULT: "hsl(220, 85%, 57%)",
          dark: "hsl(230, 85%, 35%)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(43, 96%, 56%)", // Premium gold
          foreground: "hsl(230, 85%, 15%)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(0, 0%, 100%)",
          foreground: "hsl(220, 13%, 13%)",
        },
        success: {
          DEFAULT: "hsl(142, 76%, 36%)",
          foreground: "hsl(0, 0%, 98%)",
        },
        warning: {
          DEFAULT: "hsl(43, 96%, 56%)",
          foreground: "hsl(43, 96%, 15%)",
        },
        error: {
          DEFAULT: "hsl(0, 84%, 60%)",
          foreground: "hsl(0, 0%, 98%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'aviation-gradient': 'linear-gradient(135deg, hsl(220, 85%, 57%) 0%, hsl(230, 85%, 47%) 100%)',
        'premium-gradient': 'linear-gradient(135deg, hsl(220, 85%, 57%) 0%, hsl(260, 85%, 47%) 100%)',
        'card-gradient': 'linear-gradient(135deg, hsl(0, 0%, 100%) 0%, hsl(220, 85%, 98%) 100%)',
      },
      boxShadow: {
        'aviation': '0 10px 25px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)',
        'floating': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 25px 50px -12px rgba(59, 130, 246, 0.25)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": {
            "box-shadow": "0 0 0 0 hsl(220, 85%, 57% / 0.4)",
            transform: "scale(1)",
          },
          "50%": {
            "box-shadow": "0 0 0 8px hsl(220, 85%, 57% / 0)",
            transform: "scale(1.01)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}