import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography } from '../../src/theme/tokens';
import { useAuthStore } from '../../src/stores/authStore';
import { ChevronLeftIcon, ChevronRightIcon } from '../../src/components/Icons';

interface SettingItem {
  label: string;
  path: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const GROUPS: SettingGroup[] = [
  {
    title: 'Account & profile',
    items: [
      { label: 'Account & Security', path: '/settings/sub/account' },
      { label: 'Pet profiles', path: '/settings/sub/pets' },
    ],
  },
  {
    title: 'Membership',
    items: [{ label: 'Membership', path: '/settings/sub/membership' }],
  },
  {
    title: 'Display & Language',
    items: [
      { label: 'Language', path: '/settings/sub/language' },
      { label: 'Font Size', path: '/settings/sub/fontsize' },
    ],
  },
  {
    title: 'General',
    items: [
      { label: 'Notifications', path: '/settings/sub/notification' },
      { label: 'General', path: '/settings/sub/general' },
      { label: 'Privacy', path: '/settings/sub/privacy' },
    ],
  },
  {
    title: 'Content & Social',
    items: [
      { label: 'My Content', path: '/settings/sub/content' },
      { label: 'Interaction Settings', path: '/settings/sub/interaction' },
    ],
  },
  {
    title: 'Other',
    items: [
      { label: 'About Us', path: '/settings/sub/about' },
      { label: 'Help & Feedback', path: '/settings/sub/feedback' },
    ],
  },
];

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);

  async function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of this account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ],
      { cancelable: true }
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: 12, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <ChevronLeftIcon size={20} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.pageX, paddingBottom: 90 + insets.bottom }}
      >
        {GROUPS.map((group, groupIndex) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.label}
                  activeOpacity={0.7}
                  style={[
                    styles.cell,
                    itemIndex < group.items.length - 1 && styles.cellBorder,
                  ]}
                  onPress={() => router.push(item.path as any)}
                >
                  <Text style={styles.cellLabel}>{item.label}</Text>
                  <ChevronRightIcon size={16} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.pageX,
    gap: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: typography.display,
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.fg,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  group: {
    marginBottom: spacing.md,
  },
  groupTitle: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    letterSpacing: 0.01,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  cellBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cellLabel: {
    fontSize: typography.sizes.base,
    color: colors.fg,
  },
  logoutBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.btn,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  logoutText: {
    fontSize: typography.sizes.base,
    color: colors.danger,
    fontWeight: '500',
  },
});
