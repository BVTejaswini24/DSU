/**
 * Tailwind v3 cannot splice an alpha into a raw `var(--x)` colour, so it
 * silently drops every opacity utility built on one (`bg-primary/10`,
 * `border-border/50`, `hover:bg-card/70`, …) — they never appear in the
 * stylesheet. Wrapping each token here makes them compile to
 * `color-mix(in srgb, var(--x) calc(<alpha> * 100%), transparent)`, which keeps
 * the hex tokens in src/index.css as the single source of truth for both
 * themes. color-mix() is baseline-supported (Chrome 111 / Safari 16.2 /
 * Firefox 113).
 */
const color = (token) =>
  function themeColor({ opacityValue = 1 } = {}) {
    return `color-mix(in srgb, var(${token}) calc(${opacityValue} * 100%), transparent)`;
  };

export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  darkMode: 'selector',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        background: color('--background'),
        foreground: color('--foreground'),
        card: color('--card'),
        'card-foreground': color('--card-foreground'),
        popover: color('--popover'),
        'popover-foreground': color('--popover-foreground'),
        primary: color('--primary'),
        'primary-foreground': color('--primary-foreground'),
        'brand-2': color('--brand-2'),
        secondary: color('--secondary'),
        'secondary-foreground': color('--secondary-foreground'),
        muted: color('--muted'),
        'muted-foreground': color('--muted-foreground'),
        accent: color('--accent'),
        'accent-foreground': color('--accent-foreground'),
        destructive: color('--destructive'),
        border: color('--border'),
        input: color('--input'),
        ring: color('--ring'),
        'chart-1': color('--chart-1'),
        'chart-2': color('--chart-2'),
        'chart-3': color('--chart-3'),
        'chart-4': color('--chart-4'),
        'chart-5': color('--chart-5'),
        sidebar: color('--sidebar'),
        'sidebar-foreground': color('--sidebar-foreground'),
        'sidebar-primary': color('--sidebar-primary'),
        'sidebar-primary-foreground': color('--sidebar-primary-foreground'),
        'sidebar-accent': color('--sidebar-accent'),
        'sidebar-accent-foreground': color('--sidebar-accent-foreground'),
        'sidebar-border': color('--sidebar-border'),
        'sidebar-ring': color('--sidebar-ring'),
        'destructive-foreground': color('--destructive-foreground')
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Geist'],
        pixel: ['VT323', 'monospace'],
        mono: ['"Geist Mono"']
      }
    }
  }
}
