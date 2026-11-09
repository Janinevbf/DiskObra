import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../../context/auth';

export default function Perfil() {
  const { sessao, sair } = useAuth();

  const handleSair = () => {
    sair();
  };

  const inicial = sessao?.nome?.charAt(0).toUpperCase() ?? 'C';

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{inicial}</Text>
      </View>

      <Text style={styles.nome}>{sessao?.nome ?? 'Cliente'}</Text>
      <Text style={styles.email}>{sessao?.email ?? ''}</Text>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Tipo de conta</Text>
          <Text style={styles.cardValue}>Cliente</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Código do cliente</Text>
          <Text style={styles.cardValue}>{sessao?.clienteId ?? '-'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSair}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  nome: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  email: { fontSize: 14, color: '#777', marginTop: 4, marginBottom: 24 },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  cardLabel: { fontSize: 14, color: '#666' },
  cardValue: { fontSize: 14, fontWeight: '600', color: '#333' },
  divider: { height: 1, backgroundColor: '#f0f0f0' },
  logoutButton: {
    marginTop: 28,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9534f',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  logoutText: { color: '#d9534f', fontSize: 15, fontWeight: 'bold' },
});
