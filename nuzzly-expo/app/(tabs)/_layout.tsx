import { Slot, useRouter, useSegments } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabBar from '../../src/components/TabBar';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/tokens';

export default function TabsLayout() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = ['pet/create', 'dietary-preference', 'avatar/generate'].some((p) =>
      segments.includes(p)
    );
    if (!session && !inAuthGroup && !inOnboarding) {
      router.replace('/login');
    }
  }, [session, initialized, segments]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Slot />
      </View>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
});
