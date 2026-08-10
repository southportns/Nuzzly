import { View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../theme/tokens';

const tabs = [
  { key: 'home', label: 'Home', icon: 'home' as const, href: '/' },
  { key: 'products', label: 'Products', icon: 'cube' as const, href: '/products' },
  { key: 'community', label: '', center: true, href: '/community' },
  { key: 'ai', label: 'Mayor', icon: 'paw' as const, href: '/ai' },
  { key: 'profile', label: 'My', icon: 'person' as const, href: '/profile' },
];

export default function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const active = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <View style={[styles.container, { bottom: 8 + insets.bottom }]}>
      {tabs.map((tab) => {
        const isActive = active(tab.href);

        if (tab.center) {
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => router.push(tab.href as any)}
              style={styles.centerBtn}
            >
              <View style={styles.centerCircle}>
                <Image
                  source={require('../../assets/images/daohanglogo.png')}
                  style={styles.centerLogo}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => router.push(tab.href as any)}
            style={styles.tabItem}
          >
            <Ionicons
              name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
              size={22}
              color={isActive ? colors.primary : colors.muted}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 51,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: radius.tab,
    ...shadows.tab,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 100,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
  },
  label: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 3,
    fontWeight: '500',
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  dot: {
    position: 'absolute',
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  centerBtn: {
    marginTop: -28,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLogo: {
    width: 65,
    height: 65,
  },
});
