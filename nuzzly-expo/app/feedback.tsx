import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PageHeader from '../src/components/PageHeader';
import { useAuth } from '../src/hooks/useAuth';
import { useFeedbackEvents, getEventTypeIcon, getEventTypeLabel } from '../src/hooks/useFeedbackEvents';
import { colors, spacing, radius, shadows } from '../src/theme/tokens';

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { feedbackEvents, loading, fetchFeedbackEvents } = useFeedbackEvents();

  useEffect(() => {
    fetchFeedbackEvents(session?.user?.id);
  }, [session?.user?.id]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <PageHeader title="反馈历史" />
      <ScrollView contentContainerStyle={styles.body}>
        {!loading && feedbackEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>暂无反馈记录</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {feedbackEvents.map((event) => (
              <View key={event.id} style={styles.feedbackItem}>
                <Text style={styles.feedbackIcon}>{getEventTypeIcon(event.event_type)}</Text>
                <View style={styles.feedbackInfo}>
                  <Text style={styles.feedbackType}>{getEventTypeLabel(event.event_type)}</Text>
                  <Text style={styles.feedbackDate}>{formatDate(event.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
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
  body: {
    paddingHorizontal: spacing.pageX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.fg,
  },
  list: {
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  feedbackIcon: {
    fontSize: 20,
  },
  feedbackInfo: {
    flex: 1,
  },
  feedbackType: {
    fontSize: 14,
    color: colors.fg,
  },
  feedbackDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
