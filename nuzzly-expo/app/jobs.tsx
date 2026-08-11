import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadows, typography } from '../src/theme/tokens';
import PageHeader from '../src/components/PageHeader';
import EmptyState from '../src/components/EmptyState';
import { useComputationJobs, ComputationJob } from '../src/hooks/useComputationJobs';

function formatDate(dateStr?: string) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const { jobs, loading, fetchJobs, getJobStatusLabel, getJobStatusColor, getJobTypeLabel } =
    useComputationJobs();

  useEffect(() => {
    fetchJobs();
  }, []);

  const renderJob = (job: ComputationJob) => {
    const statusColor = getJobStatusColor(job.status);
    return (
      <View key={job.id} style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobType}>{getJobTypeLabel(job.job_type)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}14` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getJobStatusLabel(job.status)}
            </Text>
          </View>
        </View>
        <View style={styles.jobMeta}>
          <Text style={styles.jobMetaText}>{formatDate(job.created_at)}</Text>
          {job.error_message ? (
            <Text style={styles.jobError} numberOfLines={2}>
              {job.error_message}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <PageHeader title="计算任务" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {!loading && jobs.length === 0 ? (
          <EmptyState icon="⚙️" title="暂无计算任务" />
        ) : (
          <View style={styles.jobList}>{jobs.map(renderJob)}</View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.pageX,
  },
  jobList: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  jobType: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  jobMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  jobMetaText: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
  },
  jobError: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.sizes.xs,
    color: colors.danger,
  },
});
