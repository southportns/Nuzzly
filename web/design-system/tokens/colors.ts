// PetRWD V2 Design Tokens — Colors
// Style: Apple Minimal + Premium Pet Trust Infrastructure
// Warm cream background, soft coral accent, sage green for data

export const colors = {
  // ── Primary: Warm Coral / Soft Orange ──
  primary: {
    50:  "#FFF3F0",
    100: "#FFE0D9",
    200: "#FFCABC",
    300: "#FFB09E",
    400: "#FF9680",
    500: "#FF7A59",  // THE accent — warm coral
    600: "#E86A4A",
    700: "#CC5A3D",
    800: "#994330",
    900: "#662D20",
  },

  // ── Neutral: Warm Gray Scale ──
  neutral: {
    50:  "#FFFFFF",   // pure white cards
    100: "#F7F6F3",   // warm cream background
    200: "#F0EFED",   // input / muted bg
    300: "#E5E4E2",   // divider
    400: "#D2D1CF",   // chip border
    500: "#6B6B6B",   // subtext
    600: "#555555",
    700: "#333333",
    800: "#111111",   // near-black text
    900: "#000000",   // pure black
  },

  // ── Surface ──
  surface: {
    canvas:       "#F7F6F3",
    card:         "#FFFFFF",
    cardHover:    "#FAFAF9",
    muted:        "#F0EFED",
    line:         "rgba(0, 0, 0, 0.06)",
  },

  // ── Data / Chart Colors ──
  chart: {
    coral:    "#FF7A59",
    sage:     "#A8C5A0",   // sage green — health/positive
    sand:     "#E8A87C",   // warm sand
    sky:      "#7BA7BC",   // muted blue
    stone:    "#C4A882",   // warm stone
  },

  // ── Semantic ──
  success: "#A8C5A0",
  warning: "#E8A87C",
  danger:  "#E85D4A",
  info:    "#7BA7BC",
} as const

// CSS-ready flat tokens
export const cssColors = {
  "--background":          "#F7F6F3",
  "--foreground":          "#111111",
  "--card":                "#FFFFFF",
  "--card-foreground":     "#111111",
  "--card-border":         "rgba(0, 0, 0, 0.06)",
  "--primary":             "#FF7A59",
  "--primary-foreground":  "#ffffff",
  "--secondary":           "#F7F7F5",
  "--secondary-foreground":"#111111",
  "--muted":               "#F0EFED",
  "--muted-foreground":    "#6B6B6B",
  "--accent":              "#F0EFED",
  "--accent-foreground":   "#111111",
  "--border":              "rgba(0, 0, 0, 0.06)",
  "--input":               "#F0EFED",
  "--ring":                "#FF7A5933",
  "--destructive":         "#E85D4A",
  "--destructive-foreground":"#ffffff",
  "--popover":             "#FFFFFF",
  "--popover-foreground":  "#111111",
  "--radius":              "1rem",
  "--chart-1": "#FF7A59",
  "--chart-2": "#A8C5A0",
  "--chart-3": "#E8A87C",
  "--chart-4": "#7BA7BC",
  "--chart-5": "#C4A882",
  "--sidebar-background":         "#F7F6F3",
  "--sidebar-foreground":         "#111111",
  "--sidebar-primary":            "#FF7A59",
  "--sidebar-primary-foreground": "#ffffff",
  "--sidebar-accent":             "#FFFFFF",
  "--sidebar-accent-foreground":  "#111111",
  "--sidebar-border":             "rgba(0, 0, 0, 0.06)",
  "--sidebar-ring":               "#FF7A5933",
  "--font-sans":   "'Quicksand', 'Varela Round', 'Inter', 'SF Pro Display', 'HarmonyOS Sans', system-ui, -apple-system, 'Noto Sans SC', sans-serif",
  "--font-mono":   "'JetBrains Mono', 'SF Mono', monospace",
  "--font-heading":"'Inter', 'SF Pro Display', 'HarmonyOS Sans', system-ui, -apple-system, sans-serif",
} as const
