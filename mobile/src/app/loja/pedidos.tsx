import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { API_URL } from '../../config/api';
import { useAuth } from '../../context/auth';
import { formatarPreco } from '../../utils/format';

interface ItemPedido {
  idProdutoVenda: number;
  cdProduto: number;
  qtProdutoRetirado: number;
  vlTotalProduto: number;
  produto: { noProduto: string };
}

interface Pedido {
  idVenda: number;
  dhVenda: string;
  dhPagamento: string | null;
  vlTotalVenda: number;
  icPago: number;
  tpPagamento: string | null;
  noEnderecoEntrega: string | null;
  noCidadeEntrega: string | null;
  sgUfEntrega: string | null;
  cliente: {
    noCliente: string;
    usuario?: { noEmail: string } | null;
    telefones?: { nrTelefone: string }[];
  };
  produtos: ItemPedido[];
}

export default function LojaPedidos() {
  const { sessao } = useAuth();
  const lojaId = sessao?.lojaId ?? null;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!lojaId) {
      setErroCarregamento('Esta conta não está vinculada a uma loja. Saia e entre novamente ou confira o cadastro da loja.');
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErroCarregamento(null);
    try {
      const response = await fetch(`${API_URL}/lojas/${lojaId}/pedidos`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os pedidos.');
      setPedidos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setErroCarregamento(
        error instanceof Error ? error.message : 'Não foi possível conectar à API. Confira se o servidor está ativo.'
      );
    } finally {
      setCarregando(false);
    }
  }, [lojaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const formatarData = (valor: string | null) => {
    if (!valor) return '-';
    return new Date(valor).toLocaleString('pt-BR');
  };

  if (carregando) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Pedidos recebidos</Text>
      <Text style={styles.subtitle}>
        {pedidos.length} pedido(s) com produtos da sua loja
      </Text>

      {erroCarregamento ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{erroCarregamento}</Text>
          <Text style={styles.errorDetails}>API: {API_URL} · Loja: {lojaId ?? 'não vinculada'}</Text>
          <TouchableOpacity onPress={carregar} style={styles.retryButton}>
            <Text style={styles.retry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : pedidos.length === 0 ? (
        <Text style={styles.empty}>Nenhum pedido recebido ainda.</Text>
      ) : (
        pedidos.map((pedido) => {
          const subtotal = pedido.produtos.reduce(
            (soma, item) => soma + item.vlTotalProduto,
            0
          );
          const endereco = [
            pedido.noEnderecoEntrega,
            pedido.noCidadeEntrega,
            pedido.sgUfEntrega,
          ]
            .filter(Boolean)
            .join(', ');
          const pago = pedido.icPago === 1;

          return (
            <View key={pedido.idVenda} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pedidoId}>Pedido #{pedido.idVenda}</Text>
                  <Text style={styles.data}>{formatarData(pedido.dhVenda)}</Text>
                </View>
                <View
                  style={[styles.status, pago ? styles.statusPago : styles.statusPendente]}>
                  <Text
                    style={[
                      styles.statusText,
                      pago ? styles.statusTextPago : styles.statusTextPendente,
                    ]}>
                    {pago
                      ? 'Pago'
                      : pedido.tpPagamento === 'A combinar com a loja'
                        ? 'Aguardando contato'
                        : 'Pendente'}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{pedido.cliente?.noCliente ?? '-'}</Text>
              {pedido.cliente?.telefones?.[0]?.nrTelefone ? (
                <Text style={styles.info}>{pedido.cliente.telefones[0].nrTelefone}</Text>
              ) : null}

              <Text style={styles.label}>Endereço de entrega</Text>
              <Text style={styles.value}>{endereco || 'Não informado'}</Text>

              <Text style={styles.label}>Forma de pagamento</Text>
              <Text style={styles.value}>
                {pedido.tpPagamento === 'A combinar com a loja'
                  ? 'A combinar pelo WhatsApp'
                  : pedido.tpPagamento ?? 'A combinar'}
              </Text>

              <View style={styles.itensBox}>
                {pedido.produtos.map((item) => (
                  <View key={item.idProdutoVenda} style={styles.itemRow}>
                    <Text style={styles.itemNome}>
                      {item.qtProdutoRetirado}x {item.produto.noProduto}
                    </Text>
                    <Text style={styles.itemValor}>
                      {formatarPreco(item.vlTotalProduto)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal da loja</Text>
                <Text style={styles.totalValue}>{formatarPreco(subtotal)}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  container: { padding: 20, paddingTop: 40, backgroundColor: '#f8f9fa', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2, marginBottom: 16 },
  empty: { textAlign: 'center', color: '#777', marginTop: 30 },
  errorBox: { backgroundColor: '#fff0f0', borderColor: '#e6b8b8', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12 },
  errorText: { color: '#9b2525', fontSize: 13, lineHeight: 19 },
  errorDetails: { color: '#7b5050', fontSize: 11, marginTop: 6 },
  retryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#d9534f', borderRadius: 6 },
  retry: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pedidoId: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  data: { fontSize: 12, color: '#777', marginTop: 2 },
  status: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusPago: { backgroundColor: '#e6f6ec' },
  statusPendente: { backgroundColor: '#fff4e5' },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  statusTextPago: { color: '#1e7e34' },
  statusTextPendente: { color: '#b26a00' },
  label: { fontSize: 12, color: '#888', marginTop: 10 },
  value: { fontSize: 14, color: '#333', fontWeight: '600', marginTop: 2 },
  info: { fontSize: 12, color: '#777', marginTop: 2 },
  itensBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemNome: { fontSize: 13, color: '#333', flex: 1, marginRight: 8 },
  itemValor: { fontSize: 13, color: '#555', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: { fontSize: 14, color: '#555' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#FF5722' },
});
