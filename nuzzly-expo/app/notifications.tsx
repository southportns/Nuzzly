import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EmptyState from '../src/components/EmptyState';
import { useNotifications } from '../src/hooks/useNotifications';
import { colors, spacing, radius, shadows } from '../src/theme/tokens';

const iconMap: Record<string, string> = {
  followup_reminder: 'time-outline',
  followup_overdue: 'warning-outline',
  review_published: 'checkmark-circle-outline',
  trust_score_change: 'trending-up-outline',
};

const iconBgMap: Record<string, string> = {
  followup_reminder: 'rgba(255,122,89,0.1)',
  followup_overdue: 'rgba(255,59,48,0.1)',
  review_published: 'rgba(108,138,105,0.1)',
  trust_score_change: 'rgba(123,167,188,0.1)',
};

const iconColorMap: Record<string, string> = {
  followup_reminder: '#FF7A59',
  followup_overdue: '#FF3B30',
  review_published: '#6C8A69',
  trust_score_change: '#7BA7BC',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllRead } =
    useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date().getTime();
    const diff = now - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const onTap = (n: any) => {
    markAsRead(n.id);
    if (n.action_url) {
      router.push(n.action_url);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>通知中心</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
            <Text style={styles.markAll}>全部已读</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.markAll, styles.markAllDone]}>已全部读</Text>
        )}
      </View>

      <View style={styles.subtitle}>
        <Text style={styles.subtitleText}>
          {unreadCount > 0 ? `还有 ${unreadCount} 条未读` : '所有通知已读'}
        </Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>共 {notifications.length} 条</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {loading ? (
          <View style={styles.list}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.notifCardSkeleton}>
                <View style={styles.notifIconSkeleton} />
                <View style={styles.notifContentSkeleton}>
                  <View style={[styles.shimmerLine, { width: '70%' }]} />
                  <View style={[styles.shimmerLine, { width: '90%' }]} />
                </View>
              </View>
            ))}
          </View>
        ) : notifications.length > 0 ? (
          <View style={styles.list}>
            {notifications.map((n) => {
              const iconName = iconMap[n.type] || 'shield-outline';
              const iconBg = iconBgMap[n.type] || 'rgba(139,94,70,0.1)';
              const iconColor = iconColorMap[n.type] || colors.primary;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[styles.notifCard, !n.is_read && styles.notifCardUnread]}
                  onPress={() => onTap(n)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.notifIcon, { backgroundColor: iconBg }]}>
                    <Ionicons name={iconName as any} size={18} color={iconColor} />
                  </View>
                  <View style={styles.notifContent}>
                    <Text style={[styles.notifTitle, !n.is_read && styles.notifTitleBold]}>
                      {n.title}
                    </Text>
                    {n.body ? <Text style={styles.notifBody}>{n.body}</Text> : null}
                    <Text style={styles.notifTime}>{formatTime(n.created_at)}</Text>
                  </View>
                  {!n.is_read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="🔔"
            title="暂无通知"
            description="当有新的追踪提醒或系统通知时，会在这里显示"
          />
        )}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: colors.fg,
  },
  markAll: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllDone: {
    color: colors.muted,
  },
  subtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.pageX,
    paddingTop: spacing.md,
  },
  subtitleText: {
    fontSize: 14,
    color: colors.muted,
  },
  totalBadge: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.btn,
  },
  totalText: {
    fontSize: 12,
    color: colors.muted,
  },
  body: {
    paddingHorizontal: spacing.pageX,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  list: {
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: 14,
    borderRadius: radius['2xl'],
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  notifCardUnread: {
    backgroundColor: colors.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    color: colors.fg,
    lineHeight: 20,
  },
  notifTitleBold: {
    fontWeight: '600',
  },
  notifBody: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 6,
    opacity: 0.6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  notifCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: 14,
    borderRadius: radius['2xl'],
    backgroundColor: colors.card,
  },
  notifIconSkeleton: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  notifContentSkeleton: {
    flex: 1,
    gap: 8,
  },
  shimmerLine: {
    height: 12,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
