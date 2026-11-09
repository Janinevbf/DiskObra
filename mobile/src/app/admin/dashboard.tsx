import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { Redirect } from 'expo-router';
import { API_URL } from '../../config/api';
import { useAuth } from '../../context/auth';

export default function AdminDashboard() {
  const [lojas, setLojas] = useState<any[]>([]);
  const { sessao, sair } = useAuth();

  const handleSair = () => {
    sair();
  };

  // Monitora todas as lojas e dados do sistema
  useEffect(() => {
    fetch(`${API_URL}/lojas`)
      .then(res => res.json())
      .then(data => setLojas(Array.isArray(data) ? data : []))
      .catch(err => console.error("Erro ao carregar dados do admin:", err));
  }, []);

  if (!sessao || sessao.tipoUsuario !== 'ADMIN') {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Painel do Administrador 🛡️</Text>
      <Text style={styles.subtitle}>Monitoramento Geral do Sistema DiskObra</Text>

      <View style={styles.cardStats}>
        <Text style={styles.statsText}>Total de Lojas/Construtoras cadastradas: {lojas.length}</Text>
      </View>

      <Text style={styles.sectionTitle}>Lojas Ativas no Marketplace:</Text>
      
      <FlatList
        data={lojas}
        keyExtractor={(item: any) => String(item.idLoja)}
        renderItem={({ item }: any) => (
          <View style={styles.storeCard}>
            <Text style={styles.storeName}>🏢 {item.noLoja}</Text>
            <Text style={styles.storeText}>CNPJ: {item.nrCnpj}</Text>
            <Text style={styles.storeText}>Produtos cadastrados: {item.produtos?.length || 0}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleSair}>
        <Text style={styles.logoutText}>Sair do Painel Admin</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#1e1e2d', paddingTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 20 },
  cardStats: { backgroundColor: '#2d2d44', padding: 15, borderRadius: 10, marginBottom: 20 },
  statsText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  storeCard: { backgroundColor: '#2d2d44', padding: 12, borderRadius: 8, marginBottom: 10 },
  storeName: { fontSize: 16, fontWeight: 'bold', color: '#FF5722' },
  storeText: { color: '#ccc', fontSize: 13, marginTop: 2 },
  logoutButton: { backgroundColor: '#d9534f', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  logoutText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});