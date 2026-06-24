// PetTrust Design Tokens — Motion
// Gentle, soothing, unhurried

export const motion = {
  duration: {
    fast:    "120ms",
    normal:  "200ms",
    slow:    "300ms",
    gentle:  "400ms",
  },

  easing: {
    default:  "cubic-bezier(0.4, 0, 0.2, 1)",
    spring:   "cubic-bezier(0.34, 1.56, 0.64, 1)",
    out:      "cubic-bezier(0, 0, 0.2, 1)",
    in:       "cubic-bezier(0.4, 0, 1, 1)",
    smooth:   "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },

  transition: {
    default:  "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
    hover:    "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
    expand:   "all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
}
