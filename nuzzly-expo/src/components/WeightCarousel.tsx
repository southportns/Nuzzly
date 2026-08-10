import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';

const { width: screenWidth } = Dimensions.get('window');

export interface WeightItem {
  id: string;
  name: string;
  avatar?: string | null;
  weight: string | null;
  emoji: string;
  color: string;
}

interface Props {
  items: WeightItem[];
  onRecord: () => void;
}

export default function WeightCarousel({ items, onRecord }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WeightRecord</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={onRecord}>
          <Text style={styles.recordLink}>RecordWeight</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.length === 0 ? (
          <View style={[styles.card, styles.emptyCard]}>
            <Text style={styles.emptyText}>NonePetWeightData</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: item.color }]}>
              <View style={styles.avatarWrap}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <Text style={styles.emoji}>{item.emoji}</Text>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.weight}>
                  {item.weight ?? '--'}
                  <Text style={styles.unit}> kg</Text>
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.fg,
  },
  recordLink: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.primary,
  },
  scrollContent: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius['2xl'],
    minWidth: screenWidth * 0.58,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCard: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.muted,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    color: colors.fg,
    marginBottom: 2,
  },
  weight: {
    fontFamily: typography.num,
    fontSize: 26,
    fontWeight: '600',
    color: colors.fg,
  },
  unit: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.muted,
  },
});
