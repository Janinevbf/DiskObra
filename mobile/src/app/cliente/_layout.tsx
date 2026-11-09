import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useAuth } from '../../context/auth';
import { useCart } from '../../context/cart';

export default function ClienteLayout() {
  const { sessao } = useAuth();
  const { quantidadeTotal } = useCart();

  if (!sessao) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF5722',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: { height: 62, paddingTop: 6, paddingBottom: 8 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catálogo',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🧱</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="carrinho"
        options={{
          title: 'Carrinho',
          tabBarBadge: quantidadeTotal > 0 ? quantidadeTotal : undefined,
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🛒</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
