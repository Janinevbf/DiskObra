import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '../config/api';

interface Loja {
  idLoja: number; // Alterado para number para corresponder ao idInt do banco
  noLoja: string;
  nrCnpj: string;
}

export default function CatalogScreen() {
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const router = useRouter();

  // Busca as lojas cadastradas no backend
  useEffect(() => {
    fetch(`${API_URL}/lojas`)
      .then((res) => res.json())
      .then((data) => {
        setLojas(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao buscar:", err);
        setLoading(false);
      });
  }, []);

  // Filtra as lojas com base na barra de pesquisa
  const lojasFiltradas = lojas.filter(loja => 
    loja.noLoja.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Cabeçalho estilo iFood */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Entregando em</Text>
          <Text style={styles.headerTitle}>Sua Obra / Residência 📍</Text>
        </View>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>Entrar</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar materiais, lojas ou construtoras..."
          placeholderTextColor="#888"
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      {/* Categorias Rápidas (Horizontal) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        <View style={styles.categoryChip}><Text style={styles.categoryText}>🧱 Materiais Básicos</Text></View>
        <View style={styles.categoryChip}><Text style={styles.categoryText}>🔩 Ferragens</Text></View>
        <View style={styles.categoryChip}><Text style={styles.categoryText}>⚡ Elétrica</Text></View>
        <View style={styles.categoryChip}><Text style={styles.categoryText}>🚰 Hidráulica</Text></View>
        <View style={styles.categoryChip}><Text style={styles.categoryText}>🎨 Tintas</Text></View>
      </ScrollView>

      {/* Lista de Lojas */}
      <Text style={styles.sectionTitle}>Lojas e Construtoras Próximas</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#FF5722" style={{ marginTop: 40 }} />
      ) : lojasFiltradas.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma loja encontrada.</Text>
      ) : (
        <View style={styles.listContainer}>
          <FlatList
            data={lojasFiltradas}
            keyExtractor={(item) => item.idLoja.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.storeCard} activeOpacity={0.8}>
                <View style={styles.storeAvatar}>
                  <Text style={styles.storeAvatarText}>{item.noLoja ? item.noLoja.charAt(0).toUpperCase() : 'L'}</Text>
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{item.noLoja}</Text>
                  <Text style={styles.storeDetails}>CNPJ: {item.nrCnpj}</Text>
                  <Text style={styles.storeDelivery}>🚚 Entrega rápida • 20-30 min</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerSubtitle: { fontSize: 12, color: '#666' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  loginButton: { backgroundColor: '#FF5722', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  loginButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  searchContainer: { marginBottom: 15 },
  searchInput: { backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee', fontSize: 14 },
  categoriesContainer: { maxHeight: 50, marginBottom: 15 },
  categoryChip: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#eee', height: 38, justifyContent: 'center' },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#444' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  listContainer: { flex: 1 }, // <--- Essencial para a FlatList renderizar e rolar corretamente
  storeCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  storeAvatar: { width: 55, height: 55, backgroundColor: '#FF5722', borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  storeAvatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  storeDetails: { fontSize: 12, color: '#777', marginTop: 2 },
  storeDelivery: { fontSize: 12, color: '#2e7d32', marginTop: 4, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 30 }
});