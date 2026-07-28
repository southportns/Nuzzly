import { View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { colors, spacing, radius, shadows } from '../theme/tokens';

const tabs = [
  { key: 'home', label: '首页', icon: require('../../assets/images/毛球镇.png'), href: '/' },
  { key: 'community', label: '社区', icon: require('../../assets/images/管家 (1).svg'), href: '/community' },
  { key: 'ai', label: 'AI', center: true, icon: require('../../assets/images/喂食碗.svg'), href: '/ai' },
  { key: 'products', label: '产品', icon: require('../../assets/images/设置.png'), href: '/products' },
  { key: 'profile', label: '我的', icon: require('../../assets/images/导航栏.png'), href: '/profile' },
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
              onPress={() => router.push(tab.href)}
              style={styles.centerBtn}
            >
              <View style={styles.centerCircle}>
                <Image source={tab.icon} style={styles.centerIcon} />
              </View>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => router.push(tab.href)}
            style={styles.tabItem}
          >
            <Image source={tab.icon} style={[styles.icon, isActive && styles.activeIcon]} />
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
  icon: {
    width: 24,
    height: 24,
    tintColor: colors.muted,
    resizeMode: 'contain',
  },
  activeIcon: {
    tintColor: colors.primary,
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.btn,
  },
  centerIcon: {
    width: 32,
    height: 32,
    tintColor: '#fff',
    resizeMode: 'contain',
  },
});
