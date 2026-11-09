import { Stack } from 'expo-router';

import { AuthProvider } from '../context/auth';
import { CartProvider } from '../context/cart';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="cliente" />
          <Stack.Screen name="loja" />
          <Stack.Screen name="admin/dashboard" />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
