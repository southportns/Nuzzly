import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, radius, shadows, typography } from '../theme/tokens';
import { Pet } from '../hooks/usePets';
import { EnvironmentProfile } from '../hooks/useEnvironmentProfiles';
import { HealthRecord } from '../hooks/useHealthRecords';
import { HealthReminder } from '../hooks/useHealthReminders';
import { ChevronRightIcon } from './Icons';

const { width: screenWidth } = Dimensions.get('window');

// 鈹鈹 Label maps (mirrors web side) 鈹鈹
const speciesLabels: Record<string, string> = { cat: 'Cat', dog: 'Dog', other: 'Other' };
const sourceLabels: Record<string, string> = {
 purchased: 'Purchased',
 wild_rescued: 'Wild Rescued',
 home_raised: 'Home Raised',
 stray_adopted: 'Stray Adopted',
 other: 'Other',
};
const stomachLabels: Record<string, string> = { normal: 'Normal', sensitive: 'Sensitive', very_sensitive: 'Very Sensitive' };
const lifeStageLabels: Record<string, string> = {
 kitten: 'Kitten',
 young_adult: 'Young Adult',
 adult: 'Adult',
 senior: 'Senior',
};
const indoorOutdoorLabels: Record<string, string> = {
 indoor: 'Indoor Only',
 outdoor: 'Outdoor Only',
 mixed: 'Indoor/Outdoor Mix',
};
const activityLabels: Record<string, string> = {
 low: 'Low',
 Moderate: 'Mediumetc.',
 high: 'premium',
 very_high: 'Very premium',
};

// 鈹鈹 Age formatter (mirrors web formatAgeFromDate) 鈹鈹
function formatAgeFromDate(birthDate: string | null | undefined): string | null {
 if (!birthDate) return null;
 const birth = new Date(birthDate);
 if (isNaN(birth.getTime())) return null;
 const now = new Date();
 if (now < birth) return null;
 let Y = now.getFullYear() - birth.getFullYear();
 let months = now.getMonth() - birth.getMonth();
 if (now.getDate() < birth.getDate()) months--;
 if (months < 0) {
 Y--;
 months += 12;
 }
 if (Y === 0 && months === 0) {
 const diffDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
 return `${diffDays} days`;
 }
 if (Y === 0) return `${months}months`;
 if (months === 0) return `${Y}Y old`;
 return `${Y}Y old${months}months`;
}

function formatPetAge(pet: Pet): string {
 if (pet.birth_date) return formatAgeFromDate(pet.birth_date)?? '-';
 return `${pet.age_years ?? 0}岁 ${pet.age_months ?? 0}月`;
}

function calcDays(dateStr: string | null | undefined): number | null {
 if (!dateStr) return null;
 const d = new Date(dateStr);
 if (isNaN(d.getTime())) return null;
 return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(d: string | null | undefined): string | null {
 if (!d) return null;
 const date = new Date(d);
 if (isNaN(date.getTime())) return null;
 return `${date.getFullYear()} Y${date.getMonth() + 1}M${date.getDate()}D`;
}

function fmtDue(d: string | null | undefined): string | null {
 if (!d) return null;
 const date = new Date(d + 'T00:00:00');
 const now = new Date(new Date().toDateString());
 const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
 if (diff < 0) return `Overdue ${Math.abs(diff)} days`;
 if (diff === 0) return 'Expires today';
 if (diff <= 7) return `${diff} days until expiry`;
 return fmtDate(d);
}

// 鈹鈹 Sub-components 鈹鈹

function SectionTitle({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
 return (<View style={styles.sectionHeader}>
 <View style={styles.sectionIconWrap}>
 <Text style={styles.sectionIcon}>{icon}</Text>
 </View>
 <View style={{ flex: 1 }}>
 <Text style={styles.sectionTitle}>{title}</Text>
 {desc? <Text style={styles.sectionDesc}>{desc}</Text>: null}
 </View>
 </View>);
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
 return (<View style={styles.infoRow}>
 <Text style={styles.infoLabel}>{label}</Text>
 <Text style={styles.infoValue}>{value || 'Not specified'}</Text>
 </View>);
}

function VaccineRow({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
 return (<View style={[styles.vaccineRow, highlight && styles.vaccineRowpremiumlight]}>
 <Text style={styles.vaccineLabel}>{label}</Text>
 <Text style={[styles.vaccineValue, highlight && styles.vaccineValuepremiumlight]}>
 {value || 'NoneRecord'}
 </Text>
 </View>);
}

function Badge({ text, color }: { text: string; color?: string }) {
 return (<View style={[styles.badge, color? { backgroundColor: color }: null]}>
 <Text style={styles.badgeText}>{text}</Text>
 </View>);
}

// 鈹鈹 Main component 鈹鈹

export interface PetOverviewData {
 pet: Pet;
 envprofile?: EnvironmentProfile | null;
  latestVaccine?: HealthRecord | null;
  latestMed?: HealthRecord | null;
 nextVaccineReminder?: HealthReminder | null;
 nextMedReminder?: HealthReminder | null;
}

interface Props extends PetOverviewData {
 onPress?: () => void;
}

export default function PetOverviewCard({
 pet,
 envprofile,
 latestVaccine,
 latestMed,
 nextVaccineReminder,
 nextMedReminder,
 onPress,
}: Props) {
 const petEmoji = pet.species === 'cat'? '馃惐': pet.species === 'dog'? '馃悤': '馃惥';
 const ageText = formatPetAge(pet);
 const birthDays = calcDays(pet.birth_date);
 const homeDays = calcDays(pet.home_date);

 const locationParts = [envprofile?.region, envprofile?.climate_type].filter(Boolean);
 const locationStr = locationParts.length > 0? locationParts.join(' 路 '): null;

 return (<View style={styles.container}>
 {/* Section header with "ViewDetails" link */}
 <View style={styles.headerBar}>
 <Text style={styles.headerTitle}>Pet Overview</Text>
 {onPress && (<TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.headerLink}>
 <Text style={styles.headerLinkText}>ViewDetails</Text>
 <ChevronRightIcon size={12} color={colors.primary} />
 </TouchableOpacity>)}
 </View>

 {/* 鈹鈹 Pet Hero 鈹鈹 */}
 <View style={styles.heroCard}>
 <View style={styles.heroAvatarWrap}>
 {pet.photo_url || pet.avatar_url? (<Image
 source={{ uri: pet.photo_url || pet.avatar_url }}
 style={styles.heroAvatar}
 />): (<View style={styles.heroAvatarPlaceholder}>
 <Text style={styles.heroAvatarEmoji}>{petEmoji}</Text>
 </View>)}
 </View>
 <View style={styles.heroInfo}>
 <Text style={styles.heroName}>{pet.name}</Text>
 <Text style={styles.heroSubtitle}>
 {pet.breed?? 'Unknown Breed'} 路 {ageText}
 </Text>
 <View style={styles.heroBadges}>
 <Badge text={pet.gender === 'male'? 'Male': pet.gender === 'female'? 'Female': 'Unknown'} />
 {pet.weight_kg!= null && (<Badge text={`${Number(pet.weight_kg).toFixed(1)}kg`} />)}
 {pet.neutered!= null && pet.neutered && <Badge text=" Neutered" />}
 {pet.stomach_health && pet.stomach_health!== 'normal' && (<Badge
 text={`Stomach${stomachLabels[pet.stomach_health]?? pet.stomach_health}`}
 color="rgba(255,59,48,0.08)"
 />)}
 {pet.life_stage && lifeStageLabels[pet.life_stage] && (<Badge text={lifeStageLabels[pet.life_stage]} color="rgba(139,94,70,0.08)" />)}
 </View>
 </View>
 </View>

 {/* 鈹鈹 Basic Info 鈹鈹 */}
 <View style={styles.sectionCard}>
 <SectionTitle icon="馃惥" title="Basic Info" desc="Pet Generalprofile" />
 <View style={styles.infoRows}>
 <InfoRow label="Name" value={pet.name} />
 <InfoRow label=" " value={speciesLabels[pet.species?? '']?? pet.species} />
 <InfoRow label="Breed" value={pet.breed} />
 <InfoRow label="Gender" value={pet.gender === 'male'? 'Male': pet.gender === 'female'? 'Female': 'Unknown'} />
 <InfoRow
 label="Neutered"
 value={pet.neutered == null? null: pet.neutered? ' Neutered': 'Not Neutered'}
 />
 </View>
 </View>

 {/* 鈹鈹 Age & Source 鈹鈹 */}
 <View style={styles.sectionCard}>
 <SectionTitle icon="馃搮" title="Age & Source" desc="Life stage and origin" />
 <View style={styles.infoRows}>
 <InfoRow label="Birthdayterm" value={fmtDate(pet.birth_date)} />
 {birthDays!= null && <InfoRow label=" days" value={` ${birthDays} days`} />}
 <InfoRow label="to Date" value={fmtDate(pet.home_date)} />
 {homeDays!= null && <InfoRow label="to days" value={` ${homeDays} days`} />}
 <InfoRow
 label="PetSource"
 value={pet.pet_source? sourceLabels[pet.pet_source]?? pet.pet_source: null}
 />
 </View>
 </View>

 {/* 鈹鈹 VaccineDeworming 鈹鈹 */}
 <View style={styles.sectionCard}>
 <SectionTitle icon="馃拤" title="VaccineDeworming" desc="Vaccine and DewormingMedication" />
 {/* Vaccine */}
 <View style={styles.vaccineGroup}>
 <Text style={styles.vaccineGroupTitle}>馃┖ Vaccine</Text>
 <VaccineRow label="most " value={fmtDate(latestVaccine?.record_time)} />
 <VaccineRow
 label="Next "
 value={fmtDue(nextVaccineReminder?.due_date)}
 highlight
 />
 </View>
 {/* Deworming */}
 <View style={styles.vaccineGroup}>
 <Text style={styles.vaccineGroupTitle}>馃悰 Deworming</Text>
 <VaccineRow label="mostDeworming" value={fmtDate(latestMed?.record_time)} />
 <VaccineRow
 label="NextDeworming"
 value={fmtDue(nextMedReminder?.due_date)}
 highlight
 />
 </View>
 </View>

 {/* 鈹鈹 environment 鈹鈹 */}
 <View style={styles.sectionCard}>
 <SectionTitle icon="馃彔" title="environment" desc="environmentand " />
 <View style={styles.infoRows}>
 <InfoRow label="all " value={locationStr} />
 <InfoRow
 label="many"
 value={envprofile?.multi_pet_household == null? null: envprofile.multi_pet_household? 'Yes': 'No'}
 />
 <InfoRow
 label="Medium small"
 value={envprofile?.has_children == null? null: envprofile.has_children? 'Yes': 'No'}
 />
 <InfoRow
 label="Indooroutside"
 value={envprofile?.indoor_outdoor? indoorOutdoorLabels[envprofile.indoor_outdoor]?? envprofile.indoor_outdoor: null}
 />
 <InfoRow
 label=" "
 value={envprofile?.activity_level? activityLabels[envprofile.activity_level]?? envprofile.activity_level: null}
 />
 </View>
 </View>
 </View>);
}

const styles = StyleSheet.create({
 container: {
 width: '100%',
 gap: spacing.md,
 },
 headerBar: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingHorizontal: 2,
 marginBottom: spacing.xs,
 },
 headerTitle: {
 fontSize: typography.sizes.md,
 fontWeight: '600',
 color: colors.fg,
 },
 headerLink: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: 2,
 },
 headerLinkText: {
 fontSize: typography.sizes.sm,
 fontWeight: '500',
 color: colors.primary,
 },

 // 鈹鈹 Hero 鈹鈹
 heroCard: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.md,
 padding: spacing.lg,
 backgroundColor: colors.card,
 borderRadius: radius['2xl'],...shadows.sm,
 borderWidth: 1,
 borderColor: colors.border,
 },
 heroAvatarWrap: {
 width: 60,
 height: 60,
 borderRadius: 18,
 overflow: 'hidden',
 backgroundColor: 'rgba(215,181,147,0.12)',
 alignItems: 'center',
 justifyContent: 'center',
 },
 heroAvatar: {
 width: '100%',
 height: '100%',
 },
 heroAvatarPlaceholder: {
 alignItems: 'center',
 justifyContent: 'center',
 },
 heroAvatarEmoji: {
 fontSize: 28,
 },
 heroInfo: {
 flex: 1,
 },
 heroName: {
 fontSize: typography.sizes.xl,
 fontWeight: '700',
 color: colors.fg,
 letterSpacing: -0.01,
 },
 heroSubtitle: {
 fontSize: typography.sizes.sm,
 color: colors.muted,
 marginTop: 2,
 },
 heroBadges: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: 6,
 marginTop: spacing.sm,
 },
 badge: {
 paddingVertical: 3,
 paddingHorizontal: 8,
 borderRadius: radius.pill,
 backgroundColor: 'rgba(0,0,0,0.04)',
 },
 badgeText: {
 fontSize: 11,
 fontWeight: '500',
 color: '#555',
 },

 // 鈹鈹 Section card 鈹鈹
 sectionCard: {
 backgroundColor: colors.card,
 borderRadius: radius['2xl'],...shadows.sm,
 borderWidth: 1,
 borderColor: colors.border,
 padding: spacing.lg,
 },
 sectionHeader: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: spacing.sm,
 marginBottom: spacing.md,
 },
 sectionIconWrap: {
 width: 28,
 height: 28,
 borderRadius: radius.sm,
 backgroundColor: 'rgba(255,228,210,0.6)',
 alignItems: 'center',
 justifyContent: 'center',
 },
 sectionIcon: {
 fontSize: 14,
 },
 sectionTitle: {
 fontSize: typography.sizes.base,
 fontWeight: '600',
 color: colors.fg,
 },
 sectionDesc: {
 fontSize: 11.5,
 color: colors.muted,
 marginTop: 1,
 },

 // 鈹鈹 Info rows 鈹鈹
 infoRows: {
 // -y equivalent: each row has a bottom border except the last
 },
 infoRow: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingVertical: 10,
 borderBottomWidth: StyleSheet.hairlineWidth,
 borderBottomColor: 'rgba(0,0,0,0.04)',
 },
 infoLabel: {
 fontSize: typography.sizes.base - 0.5,
 color: colors.muted,
 },
 infoValue: {
 fontSize: typography.sizes.base,
 fontWeight: '500',
 color: colors.fg,
 maxWidth: screenWidth * 0.5,
 textAlign: 'right',
 },

 // 鈹鈹 Vaccine / deworming 鈹鈹
 vaccineGroup: {
 marginTop: spacing.sm,
 },
 vaccineGroupTitle: {
 fontSize: typography.sizes.sm,
 fontWeight: '600',
 color: colors.fg,
 marginBottom: 6,
 },
 vaccineRow: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingVertical: 8,
 paddingHorizontal: spacing.md,
 borderRadius: radius.md,
 backgroundColor: 'rgba(0,0,0,0.02)',
 marginTop: 6,
 },
 vaccineRowpremiumlight: {
 backgroundColor: 'rgba(255,244,238,1)',
 },
 vaccineLabel: {
 fontSize: typography.sizes.base - 0.5,
 color: colors.muted,
 },
 vaccineValue: {
 fontSize: typography.sizes.base - 0.5,
 fontWeight: '500',
 color: colors.fg,
 },
 vaccineValuepremiumlight: {
 color: '#E85D4A',
 },
});
