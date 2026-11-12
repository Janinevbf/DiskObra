import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
  produtos: Produto[];
}

export default function LojaEstoque() {
  const { sessao, sair } = useAuth();
  const lojaId = sessao?.lojaId ?? null;

  const [loja, setLoja] = useState<Loja | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);
  const [erroOperacao, setErroOperacao] = useState<string | null>(null);
  const [mensagemOperacao, setMensagemOperacao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [noProduto, setNoProduto] = useState('');
  const [vlPreco, setVlPreco] = useState('');
  const [qtEstoque, setQtEstoque] = useState('');
  const [editandoCd, setEditandoCd] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    if (!lojaId) {
      setErroCarregamento('Esta conta não está vinculada a uma loja. Saia e entre novamente ou confira o cadastro da loja.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErroCarregamento(null);
    try {
      const response = await fetch(`${API_URL}/lojas/${lojaId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o estoque.');
      setLoja(data);
    } catch (error) {
      console.error('Erro ao carregar loja:', error);
      setErroCarregamento(
        error instanceof Error ? error.message : 'Não foi possível conectar à API. Confira se o servidor está ativo.'
      );
    } finally {
      setLoading(false);
    }
  }, [lojaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const limparFormulario = () => {
    setNoProduto('');
    setVlPreco('');
    setQtEstoque('');
    setEditandoCd(null);
  };

  const salvar = async () => {
    if (!lojaId) {
      setErroOperacao('Esta conta não está vinculada a uma loja. Saia e entre novamente.');
      return;
    }
    setErroOperacao(null);
    setMensagemOperacao(null);
    const preco = Number(vlPreco.replace(',', '.'));
    const estoque = Number(qtEstoque);
    if (!noProduto.trim() || !vlPreco.trim() || !qtEstoque.trim()) {
      setErroOperacao('Preencha nome, preço e estoque do produto.');
      return;
    }
    if (!Number.isFinite(preco) || preco <= 0 || !Number.isInteger(estoque) || estoque < 0) {
      setErroOperacao('Informe um preço válido e uma quantidade inteira de estoque igual ou maior que zero.');
      return;
    }

    setSalvando(true);
    try {
      const editando = editandoCd !== null;
      const url = editando ? `${API_URL}/produtos/${editandoCd}` : `${API_URL}/produtos`;

      const response = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editando
            ? { noProduto: noProduto.trim(), vlProdutoUnitario: preco, qtProdutoEstoque: estoque }
            : {
                idLoja: lojaId,
                noProduto: noProduto.trim(),
                vlProdutoUnitario: preco,
                qtProdutoEstoque: estoque,
              }
        ),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar produto.');

      setMensagemOperacao(editando ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.');
      limparFormulario();
      await carregar();
    } catch (error: any) {
      setErroOperacao(error.message || 'Não foi possível salvar o produto.');
    } finally {
      setSalvando(false);
    }
  };

  const iniciarEdicao = (produto: Produto) => {
    setEditandoCd(produto.cdProduto);
    setNoProduto(produto.noProduto);
    setVlPreco(String(produto.vlProdutoUnitario));
    setQtEstoque(String(produto.qtProdutoEstoque));
  };

  const excluir = (produto: Produto) => {
    Alert.alert('Excluir produto', `Deseja remover "${produto.noProduto}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/produtos/${produto.cdProduto}`, {
              method: 'DELETE',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao remover produto.');
            if (editandoCd === produto.cdProduto) limparFormulario();
            carregar();
          } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível remover o produto.');
          }
        },
      },
    ]);
  };

  const handleSair = () => {
    sair();
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF5722" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Estoque da Loja</Text>
          <Text style={styles.subtitle}>{loja?.noLoja ?? sessao?.nome}</Text>
        </View>
        <TouchableOpacity onPress={handleSair}>
          <Text style={styles.sair}>Sair</Text>
        </TouchableOpacity>
      </View>

      {erroCarregamento ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{erroCarregamento}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={carregar}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {erroOperacao ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{erroOperacao}</Text>
          <Text style={styles.errorDetails}>API: {API_URL} · Loja: {lojaId ?? 'não vinculada'}</Text>
        </View>
      ) : null}

      {mensagemOperacao ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{mensagemOperacao}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>
        {editandoCd !== null ? '✏️ Editar produto' : '🧱 Novo produto'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Nome do produto (Ex: Cimento 50kg)"
        value={noProduto}
        onChangeText={setNoProduto}
      />
      <TextInput
        style={styles.input}
        placeholder="Preço (Ex: 38.50)"
        value={vlPreco}
        onChangeText={setVlPreco}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Quantidade em estoque"
        value={qtEstoque}
        onChangeText={setQtEstoque}
        keyboardType="numeric"
      />

      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.primary, salvando && styles.buttonDisabled]}
          disabled={salvando}
          onPress={salvar}>
          <Text style={styles.buttonText}>
            {salvando
              ? 'Salvando...'
              : editandoCd !== null
                ? 'Salvar alterações'
                : 'Cadastrar produto'}
          </Text>
        </TouchableOpacity>

        {editandoCd !== null && (
          <TouchableOpacity
            style={[styles.button, styles.secondary]}
            onPress={limparFormulario}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>
        Produtos cadastrados ({loja?.produtos?.length ?? 0})
      </Text>

      {erroCarregamento ? null : loja?.produtos?.length ? (
        loja.produtos.map((produto) => (
          <View key={produto.cdProduto} style={styles.produtoCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.produtoNome}>{produto.noProduto}</Text>
              <Text style={styles.produtoInfo}>
                {formatarPreco(produto.vlProdutoUnitario)} • estoque {produto.qtProdutoEstoque}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => iniciarEdicao(produto)}>
              <Text style={styles.editText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => excluir(produto)}>
              <Text style={styles.deleteText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>Nenhum produto cadastrado.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  container: { padding: 20, paddingTop: 40, backgroundColor: '#f8f9fa', flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  sair: { color: '#d9534f', fontWeight: 'bold', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#FF5722', marginTop: 16, marginBottom: 10 },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    fontSize: 15,
  },
  formButtons: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  button: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  primary: { backgroundColor: '#FF5722' },
  secondary: { backgroundColor: '#6c757d' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  produtoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  produtoNome: { fontSize: 15, fontWeight: '600', color: '#222' },
  produtoInfo: { fontSize: 12, color: '#777', marginTop: 2 },
  editButton: {
    backgroundColor: '#e9f0ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  editText: { color: '#0d6efd', fontSize: 12, fontWeight: 'bold' },
  deleteButton: {
    backgroundColor: '#fdeaea',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  deleteText: { color: '#d9534f', fontSize: 12, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: '#777', marginTop: 10 },
  errorBox: { backgroundColor: '#fff0f0', borderColor: '#e6b8b8', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12 },
  errorText: { color: '#9b2525', fontSize: 13, lineHeight: 19 },
  errorDetails: { color: '#7b5050', fontSize: 11, marginTop: 6 },
  successBox: { backgroundColor: '#eaf7ee', borderColor: '#b7dfc3', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12 },
  successText: { color: '#216c38', fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#d9534f', borderRadius: 6 },
  retryText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
});
