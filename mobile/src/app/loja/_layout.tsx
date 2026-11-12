import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useAuth } from '../../context/auth';

export default function LojaLayout() {
  const { sessao } = useAuth();

  if (!sessao || sessao.tipoUsuario !== 'DONO_LOJA') {
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🧱</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📦</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="dados"
        options={{
          title: 'Minha Loja',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏪</Text>
          ),
        }}
      />
    </Tabs>
  );
}
