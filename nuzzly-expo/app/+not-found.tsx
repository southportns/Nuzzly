import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { colors, spacing } from '../src/theme/tokens';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.subtitle}>页面走丢了</Text>
      <Link href="/" style={styles.link}>返回首页</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  link: {
    marginTop: spacing.lg,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
