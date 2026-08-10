export const colors = {
 primary: '#8B5E46',
 primaryLight: '#A67D65',
 primaryDark: '#6B4A36',
 primaryBg: 'rgba(139, 94, 70, 0.04)',

 secondary: '#D7B593',
 accent: '#6C8A69',
 warning: '#F5A623',
 danger: '#FF3B30',
 info: '#007AFF',

 bg: '#F5F3F1',
 card: '#FFFFFF',
 fg: '#171717',
 muted: '#7B7B7B',
 border: 'rgba(0, 0, 0, 0.06)',
 sep: 'rgba(60, 60, 67, 0.12)',

 success: '#6C8A69',
 error: '#FF3B30',
 warningBg: 'rgba(245, 166, 35, 0.1)',
 errorBg: 'rgba(255, 59, 48, 0.1)',
};

export const spacing = {
 xs: 4,
 sm: 8,
 md: 12,
 lg: 16,
 xl: 20,
 '2xl': 24,
 '3xl': 32,
 pageX: 16,
 pageY: 20,
 card: 16,
 gap: 12,
};

export const radius = {
 xs: 4,
 sm: 8,
 md: 10,
 lg: 12,
 xl: 16,
 '2xl': 20,
 '3xl': 36,
 pill: 999,
 card: 36,
 btn: 999,
 tab: 999,
};

export const shadows = {
 sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' },
 md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4, boxShadow: '0px 4px 16px rgba(0,0,0,0.06)' },
 lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 30, elevation: 6, boxShadow: '0px 8px 30px rgba(0,0,0,0.06)' },
 xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 40, elevation: 8, boxShadow: '0px 12px 40px rgba(0,0,0,0.08)' },
 card: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 30, elevation: 6, boxShadow: '0px 8px 30px rgba(0,0,0,0.06)' },
 btn: { shadowColor: 'rgba(139, 94, 70, 0.18)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4, boxShadow: '0px 4px 16px rgba(139,94,70,0.18)' },
 tab: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 6, boxShadow: '0px -4px 24px rgba(0,0,0,0.06)' },
};

export const typography = {
 display: '-apple-system, SF Pro Display, system-ui, sans-serif',
 body: '-apple-system, SF Pro Text, system-ui, sans-serif',
 num: 'Inter, -apple-system, system-ui, sans-serif',
 sizes: {
 xs: 11,
 sm: 13,
 base: 14,
 md: 15,
 lg: 16,
 xl: 18,
 '2xl': 20,
 '3xl': 24,
 },
 weights: {
 normal: '400',
 medium: '500',
 semibold: '600',
 bold: '700',
 } as const,
};

export const sizes = {
 in: 44,
 button: 48,
 tab: 51,
 iconSm: 16,
 iconMd: 20,
 iconLg: 24,
 iconXl: 32,
 avatarSm: 40,
 avatarMd: 52,
 avatarLg: 64,
 touchMin: 44,
};
