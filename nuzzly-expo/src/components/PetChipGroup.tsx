import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../theme/tokens';

interface PetChip {
  id: string;
  name: string;
  emoji: string;
}

interface PetChipGroupProps {
  pets: PetChip[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function PetChipGroup({ pets, selectedId, onSelect }: PetChipGroupProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {pets.map((pet) => {
        const active = pet.id === selectedId;
        return (
          <TouchableOpacity
            key={pet.id}
            activeOpacity={0.8}
            onPress={() => onSelect(pet.id)}
            style={[styles.chip, active && styles.activeChip]}
          >
            <View style={styles.avatar}>
              <Text style={styles.emoji}>{pet.emoji}</Text>
            </View>
            <Text style={[styles.name, active && styles.activeName]}>{pet.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.pageX,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.btn,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  activeChip: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(215,181,147,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 12,
  },
  name: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.fg,
  },
  activeName: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
});
