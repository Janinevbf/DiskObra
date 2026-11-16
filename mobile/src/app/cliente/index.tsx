import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { API_URL } from '../../config/api';
import { useAuth } from '../../context/auth';
import { useCart } from '../../context/cart';
import { formatarPreco } from '../../utils/format';

interface Produto {
  cdProduto: number;
  noProduto: string;
  vlProdutoUnitario: number;
  qtProdutoEstoque: number;
}

interface Loja {
  idLoja: number;
  noLoja: string;
  nrCnpj: string;
  telefones?: { nrTelefone: string }[];
  produtos: Produto[];
}

export default function ClienteCatalogo() {
  const { sessao } = useAuth();
  const { adicionar, itens } = useCart();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErroCarregamento('');

    fetch(`${API_URL}/lojas`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Não foi possível carregar as lojas.');
        return data;
      })
      .then((data) => {
        if (ativo) setLojas(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Erro ao carregar catálogo:', err);
        if (ativo) {
          setLojas([]);
          setErroCarregamento(`Não foi possível carregar os produtos. Verifique se o servidor está ativo em ${API_URL} e tente novamente.`);
        }
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const termo = busca.trim().toLowerCase();
  const lojasFiltradas = lojas.filter((loja) => {
    if (!termo) return true;
    return (
      loja.noLoja.toLowerCase().includes(termo) ||
      loja.produtos?.some((produto) => produto.noProduto.toLowerCase().includes(termo))
    );
  });

  const handleAdicionar = (loja: Loja, produto: Produto) => {
    const adicionado = adicionar({
      cdProduto: produto.cdProduto,
      noProduto: produto.noProduto,
      vlProdutoUnitario: produto.vlProdutoUnitario,
      qtProdutoEstoque: Number(produto.qtProdutoEstoque),
      idLoja: loja.idLoja,
      noLoja: loja.noLoja,
      nrTelefoneLoja: loja.telefones?.[0]?.nrTelefone ?? '',
    });
    if (adicionado) {
      Alert.alert('Adicionado ao carrinho', `${produto.noProduto} foi adicionado.`);
    } else {
      const existente = itens.find((item) => item.cdProduto === produto.cdProduto);
      Alert.alert(
        'Estoque insuficiente',
        `Há somente ${produto.qtProdutoEstoque} unidade(s) de ${produto.noProduto} disponível(is).${existente ? ` Você já tem ${existente.qtProduto} no carrinho.` : ''}`
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Olá, {sessao?.nome ?? 'cliente'}</Text>
        <Text style={styles.headerTitle}>O que você precisa para a obra? 🔨</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar material ou loja..."
        placeholderTextColor="#888"
        value={busca}
        onChangeText={setBusca}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#FF5722" style={{ marginTop: 40 }} />
      ) : erroCarregamento ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{erroCarregamento}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setTentativa((valor) => valor + 1)}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}>
          {lojasFiltradas.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum material encontrado.</Text>
          ) : (
            lojasFiltradas.map((loja) => (
              <View key={loja.idLoja} style={styles.lojaCard}>
                <View style={styles.lojaHeader}>
                  <View style={styles.lojaAvatar}>
                    <Text style={styles.lojaAvatarText}>
                      {loja.noLoja?.charAt(0).toUpperCase() ?? 'L'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lojaNome}>{loja.noLoja}</Text>
                    <Text style={styles.lojaInfo}>CNPJ: {loja.nrCnpj}</Text>
                  </View>
                </View>

                {loja.produtos?.length ? (
                  loja.produtos.map((produto) => (
                    <View key={produto.cdProduto} style={styles.produtoRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.produtoNome}>{produto.noProduto}</Text>
                        <Text style={styles.produtoInfo}>
                          {formatarPreco(produto.vlProdutoUnitario)} •{' '}
                          {produto.qtProdutoEstoque > 0
                            ? `Estoque: ${produto.qtProdutoEstoque}`
                            : 'Produto indisponível'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          produto.qtProdutoEstoque <= 0 && styles.addButtonDisabled,
                        ]}
                        disabled={produto.qtProdutoEstoque <= 0}
                        onPress={() => handleAdicionar(loja, produto)}>
                        <Text style={styles.addButtonText}>
                          {produto.qtProdutoEstoque <= 0 ? 'Sem estoque' : '+ Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.lojaInfo}>Nenhum produto cadastrado ainda.</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingTop: 40 },
  header: { marginBottom: 12 },
  headerSubtitle: { fontSize: 13, color: '#666' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 2 },
  searchInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 14,
    marginBottom: 12,
  },
  list: { paddingBottom: 24 },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 30 },
  lojaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  lojaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  lojaAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  lojaAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  lojaNome: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  lojaInfo: { fontSize: 12, color: '#777', marginTop: 2 },
  produtoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
  },
  produtoNome: { fontSize: 14, fontWeight: '600', color: '#333' },
  produtoInfo: { fontSize: 12, color: '#777', marginTop: 2 },
  addButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginLeft: 8,
  },
  addButtonDisabled: { backgroundColor: '#ccc' },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  errorBox: { backgroundColor: '#fff0f0', borderColor: '#e6b8b8', borderWidth: 1, borderRadius: 8, padding: 14, marginTop: 20 },
  errorText: { color: '#8b2020', fontSize: 14, lineHeight: 20 },
  retryButton: { alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#FF5722', borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
});
