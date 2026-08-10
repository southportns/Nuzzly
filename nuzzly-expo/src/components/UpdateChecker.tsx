import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import * as Updates from 'expo-updates';
import { colors, radius, shadows } from '../theme/tokens';

export default function UpdateChecker() {
 const [updateAvailable, setUpdateAvailable] = useState(false);
 const [isChecking, setIsChecking] = useState(false);

 useEffect(() => {
 // use start Checking for updates
 checkForUpdate();

 // every 30 secondscheck1Update(developmentdebug make use, productionenvironment longinterval)
 const interval = setInterval(() => {
 checkForUpdate();
 }, 30000);

 return () => clearInterval(interval);
 }, []);

 async function checkForUpdate() {
 if (isChecking) return;
 setIsChecking(true);

 try {
 // Non-developmentModenextChecking for updates
 if (__DEV__) {
 setIsChecking(false);
 return;
 }

 const update = await Updates.checkForUpdateAsync();
 if (update.isAvailable) {
 setUpdateAvailable(true);
 }
 } catch (error) {
 console.log('Checking for updates Failed:', error);
 } finally {
 setIsChecking(false);
 }
 }

 async function applyUpdate() {
 try {
 await Updates.fetchUpdateAsync();
 await Updates.reloadAsync();
 } catch (error) {
 console.log(' use Update Failed:', error);
 }
 }

 if (!updateAvailable) return null;

 return (<Modal transparent animationType="fade" visible={updateAvailable}>
 <View style={styles.overlay}>
 <View style={styles.card}>
 <Text style={styles.title}>New Version Available</Text>
 <Text style={styles.message}>A new update is available. Restart to experience the latest features.</Text>
 <View style={styles.buttons}>
 <TouchableOpacity style={styles.btnSecondary} onPress={() => setUpdateAvailable(false)}>
 <Text style={styles.btnSecondaryText}>Later</Text>
 </TouchableOpacity>
 <TouchableOpacity style={styles.btnPrimary} onPress={applyUpdate}>
 <Text style={styles.btnPrimaryText}>Restart Now</Text>
 </TouchableOpacity>
 </View>
 </View>
 </View>
 </Modal>);
}

const styles = StyleSheet.create({
 overlay: {
 flex: 1,
 backgroundColor: 'rgba(0,0,0,0.5)',
 alignItems: 'center',
 justifyContent: 'center',
 padding: 20,
 },
 card: {
 width: '100%',
 maxWidth: 320,
 backgroundColor: colors.card,
 borderRadius: radius.card,
 padding: 24,...shadows.md,
 },
 title: {
 fontSize: 18,
 fontWeight: '600',
 color: colors.fg,
 marginBottom: 8,
 },
 message: {
 fontSize: 14,
 color: colors.muted,
 lineHeight: 20,
 marginBottom: 20,
 },
 buttons: {
 flexDirection: 'row',
 gap: 12,
 },
 btnPrimary: {
 flex: 1,
 height: 44,
 backgroundColor: colors.primary,
 borderRadius: radius.btn,
 alignItems: 'center',
 justifyContent: 'center',...shadows.btn,
 },
 btnPrimaryText: {
 color: '#fff',
 fontSize: 15,
 fontWeight: '600',
 },
 btnSecondary: {
 flex: 1,
 height: 44,
 backgroundColor: 'rgba(0,0,0,0.05)',
 borderRadius: radius.btn,
 alignItems: 'center',
 justifyContent: 'center',
 },
 btnSecondaryText: {
 color: colors.muted,
 fontSize: 15,
 fontWeight: '500',
 },
});
