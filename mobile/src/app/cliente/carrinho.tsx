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

const FORMAS_PAGAMENTO = ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];

export default function Carrinho() {
  const { sessao } = useAuth();
  const { itens, total, alterarQuantidade, remover, limpar } = useCart();
  const [enviando, setEnviando] = useState(false);

  const [noEndereco, setNoEndereco] = useState('');
  const [noCidade, setNoCidade] = useState('');
  const [sgUf, setSgUf] = useState('');
  const [tpPagamento, setTpPagamento] = useState('PIX');

  useEffect(() => {
    if (!sessao?.clienteId) return;

    fetch(`${API_URL}/clientes/${sessao.clienteId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const endereco = data?.enderecos?.[0];
        if (endereco) {
          setNoEndereco(endereco.noEndereco ?? '');
          setNoCidade(endereco.noCidade ?? '');
          setSgUf(endereco.sgUf ?? '');
        }
      })
      .catch(() => {});
  }, [sessao?.clienteId]);

  const finalizarPedido = async () => {
    if (itens.length === 0) {
      Alert.alert('Carrinho vazio', 'Adicione materiais antes de finalizar.');
      return;
    }

    if (!sessao?.clienteId) {
      Alert.alert(
        'Não foi possível finalizar',
        'Sua conta de cliente não está vinculada. Faça login novamente.'
      );
      return;
    }

    if (!noEndereco.trim() || !noCidade.trim() || !sgUf.trim()) {
      Alert.alert('Endereço de entrega', 'Informe endereço, cidade e UF.');
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch(`${API_URL}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idCliente: sessao.clienteId,
          tpPagamento,
          noEnderecoEntrega: noEndereco.trim(),
          noCidadeEntrega: noCidade.trim(),
          sgUfEntrega: sgUf.trim().toUpperCase(),
          itens: itens.map((item) => ({
            cdProduto: item.cdProduto,
            qtProdutoRetirado: item.qtProduto,
            vlTotalProduto: item.vlProdutoUnitario * item.qtProduto,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao finalizar o pedido.');

      limpar();
      Alert.alert(
        'Pedido realizado!',
        `Entrega em ${noEndereco.trim()}, ${noCidade.trim()} - ${sgUf
          .trim()
          .toUpperCase()}.\nPagamento: ${tpPagamento}.`
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível finalizar o pedido.');
    } finally {
      setEnviando(false);
    }
  };

  if (itens.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
        <Text style={styles.emptyText}>Volte ao catálogo e adicione materiais.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carrinho de compras</Text>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {itens.map((item) => (
          <View key={item.cdProduto} style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemNome}>{item.noProduto}</Text>
              <Text style={styles.itemLoja}>{item.noLoja}</Text>
              <Text style={styles.itemPreco}>
                {formatarPreco(item.vlProdutoUnitario)} / un.
              </Text>
            </View>

            <View style={styles.qtyContainer}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => alterarQuantidade(item.cdProduto, item.qtProduto - 1)}>
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.qtProduto}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => alterarQuantidade(item.cdProduto, item.qtProduto + 1)}>
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => remover(item.cdProduto)}>
              <Text style={styles.removeButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Endereço de entrega</Text>

        <TextInput
          style={styles.input}
          placeholder="Endereço completo (Rua, nº, bairro)"
          placeholderTextColor="#888"
          value={noEndereco}
          onChangeText={setNoEndereco}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.cidadeInput]}
            placeholder="Cidade"
            placeholderTextColor="#888"
            value={noCidade}
            onChangeText={setNoCidade}
          />
          <TextInput
            style={[styles.input, styles.ufInput]}
            placeholder="UF"
            placeholderTextColor="#888"
            value={sgUf}
            onChangeText={setSgUf}
            maxLength={2}
            autoCapitalize="characters"
          />
        </View>

        <Text style={styles.sectionTitle}>Forma de pagamento</Text>

        <View style={styles.pagamentos}>
          {FORMAS_PAGAMENTO.map((forma) => {
            const selecionado = forma === tpPagamento;
            return (
              <TouchableOpacity
                key={forma}
                style={[styles.pagamentoChip, selecionado && styles.pagamentoChipSelected]}
                onPress={() => setTpPagamento(forma)}>
                <Text
                  style={[
                    styles.pagamentoChipText,
                    selecionado && styles.pagamentoChipTextSelected,
                  ]}>
                  {forma}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatarPreco(total)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.finalizarButton, enviando && styles.finalizarButtonDisabled]}
          disabled={enviando}
          onPress={finalizarPedido}>
          {enviando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.finalizarButtonText}>Finalizar pedido</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingTop: 40 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  list: { paddingBottom: 16 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemNome: { fontSize: 15, fontWeight: 'bold', color: '#222' },
  itemLoja: { fontSize: 12, color: '#888', marginTop: 2 },
  itemPreco: { fontSize: 13, color: '#FF5722', marginTop: 4, fontWeight: '600' },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  qtyText: { marginHorizontal: 10, fontSize: 15, fontWeight: 'bold', color: '#333' },
  removeButton: { padding: 6 },
  removeButtonText: { fontSize: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
    marginTop: 18,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 10 },
  cidadeInput: { flex: 1 },
  ufInput: { width: 80 },
  pagamentos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pagamentoChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  pagamentoChipSelected: { backgroundColor: '#FF5722', borderColor: '#FF5722' },
  pagamentoChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  pagamentoChipTextSelected: { color: '#fff' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 16, color: '#555' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  finalizarButton: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  finalizarButtonDisabled: { opacity: 0.7 },
  finalizarButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptyText: { fontSize: 14, color: '#777', marginTop: 6, textAlign: 'center' },
});
