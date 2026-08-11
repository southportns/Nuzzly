import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../src/stores/authStore';
import UpdateChecker from '../src/components/UpdateChecker';

export default function RootLayout() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="butler" options={{ headerShown: false }} />
          <Stack.Screen name="dietary-preference" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="followups" options={{ headerShown: false }} />
          <Stack.Screen name="health-reminders" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="pet/create" options={{ headerShown: false }} />
          <Stack.Screen name="pets/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="products/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="record/create" options={{ headerShown: false }} />
          <Stack.Screen name="review/create" options={{ headerShown: false }} />
          <Stack.Screen name="settings/sub/[key]" options={{ headerShown: false }} />
          <Stack.Screen name="tasks/[petId]" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
        </Stack>
        <StatusBar style="dark" />
        <UpdateChecker />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
