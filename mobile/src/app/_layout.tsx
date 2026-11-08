import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="cliente/dashboard" />
      <Stack.Screen name="loja/dashboard" />
      <Stack.Screen name="admin/dashboard" />
    </Stack>
  );
}