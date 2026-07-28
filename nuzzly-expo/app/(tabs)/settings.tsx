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
    title: '账号与资料',
    items: [
      { label: '账号与安全', path: '/settings/sub/account' },
      { label: '宠物档案', path: '/settings/sub/pets' },
    ],
  },
  {
    title: '会员',
    items: [{ label: '会员', path: '/settings/sub/membership' }],
  },
  {
    title: '显示与语言',
    items: [
      { label: '语言', path: '/settings/sub/language' },
      { label: '文字大小', path: '/settings/sub/fontsize' },
    ],
  },
  {
    title: '基础',
    items: [
      { label: '通知', path: '/settings/sub/notification' },
      { label: '通用', path: '/settings/sub/general' },
      { label: '隐私', path: '/settings/sub/privacy' },
    ],
  },
  {
    title: '内容与社交',
    items: [
      { label: '我的内容', path: '/settings/sub/content' },
      { label: '互动设置', path: '/settings/sub/interaction' },
    ],
  },
  {
    title: '其他',
    items: [
      { label: '关于我们', path: '/settings/sub/about' },
      { label: '帮助与反馈', path: '/settings/sub/feedback' },
    ],
  },
];

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);

  async function handleLogout() {
    Alert.alert(
      '退出登录',
      '确定要退出当前账号吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
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
      <View style={[styles.header, { paddingTop: 12 + insets.top, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <ChevronLeftIcon size={20} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.title}>设置</Text>
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
          <Text style={styles.logoutText}>退出登录</Text>
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
