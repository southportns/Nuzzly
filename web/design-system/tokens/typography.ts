// Nuzzly毛球镇 V2 Design Tokens — Typography
// Style: Apple Minimal — large hero, tight tracking, warm serif feel via sans

export const typography = {
  fontFamily: {
    sans:  "'Quicksand', 'Varela Round', 'Inter', 'SF Pro Display', 'HarmonyOS Sans', system-ui, -apple-system, 'Noto Sans SC', sans-serif",
    mono:  "'JetBrains Mono', 'SF Mono', monospace",
  },

  fontSize: {
    "hero-display": "4.5rem",   // 72px — hero headline (Apple-style huge)
    "display-lg":   "2.5rem",   // 40px — tile headlines
    "display-md":   "2.125rem", // 34px — section heads
    "lead":         "1.75rem",  // 28px — subcopy
    "lead-airy":    "1.5rem",   // 24px — airy lead
    "tagline":      "1.0625rem",// 17px — tagline / body
    "body-strong":  "1.0625rem",// 17px — strong body
    "body":         "1.0625rem",// 17px — Apple default body
    "caption":      "0.875rem", // 14px — captions
    "fine-print":   "0.75rem",  // 12px — fine print
    "nav-link":     "0.8125rem",// 13px — nav links
    "overline":     "0.8125rem",// 13px — overline label
  },

  fontWeight: {
    light:    "300",
    normal:   "400",
    medium:   "500",
    semibold: "600",
    bold:     "700",
  },

  lineHeight: {
    tight:   "1.05",   // hero display
    snug:    "1.14",   // lead
    body:    "1.8",    // body text (more breathing room)
    relaxed: "2.41",   // dense link columns
  },

  letterSpacing: {
    hero:     "-0.04em",  // hero display — very tight
    display:  "-0.011em", // section heads
    body:     "-0.022em", // body text
    caption:  "-0.016em", // captions
    nav:      "-0.01em",  // nav links
    overline: "0.12em",   // overline label — wide
    none:     "0",
  },
} as const
