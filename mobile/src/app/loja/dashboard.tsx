import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function LojaDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // O ID da loja vem automaticamente da sessão/login nos bastidores!
  const idLoja = params.lojaId; 

  // Estados para o Endereço da Loja
  const [noRua, setNoRua] = useState('');
  const [nrNumero, setNrNumero] = useState('');
  const [noBairro, setNoBairro] = useState('');
  const [noCidade, setNoCidade] = useState('');
  const [sgEstado, setSgEstado] = useState('');
  const [nrCep, setNrCep] = useState('');

  // Estados para o Produto / Material
  const [noProduto, setNoProduto] = useState('');
  const [dsProduto, setDsProduto] = useState('');
  const [vlPreco, setVlPreco] = useState('');
  const [qtEstoque, setQtEstoque] = useState('');

  // 1. Enviar Endereço para a rota POST /enderecos
  const handleCadastrarEndereco = async () => {
    if (!noRua || !nrNumero || !noBairro || !noCidade || !sgEstado || !nrCep) {
      Alert.alert("Atenção", "Preencha todos os campos do endereço!");
      return;
    }

    try {
      const response = await fetch('http://192.168.15.8:3000/enderecos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idLoja: Number(idLoja),
          noRua,
          nrNumero,
          noBairro,
          noCidade,
          sgEstado,
          nrCep,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      Alert.alert("Sucesso!", "Endereço da loja cadastrado com sucesso!");
      setNoRua(''); setNrNumero(''); setNoBairro(''); setNoCidade(''); setSgEstado(''); setNrCep('');
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível cadastrar o endereço.");
    }
  };

  // 2. Enviar Produto para a rota POST /produtos
  const handleCadastrarProduto = async () => {
    if (!noProduto || !vlPreco || !qtEstoque) {
      Alert.alert("Atenção", "Preencha o Nome, Preço e Estoque do produto!");
      return;
    }

    try {
      const response = await fetch('http://192.168.15.8:3000/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idLoja: Number(idLoja),
          noProduto,
          dsProduto,
          vlPreco,
          qtEstoque,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      Alert.alert("Sucesso!", "Produto cadastrado e disponível no catálogo!");
      setNoProduto(''); setDsProduto(''); setVlPreco(''); setQtEstoque('');
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível cadastrar o produto.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Painel da Construtora 🏗️</Text>
      <Text style={styles.subtitle}>Loja ID #{idLoja} conectada com sucesso</Text>

      <View style={styles.divider} />

      {/* Seção de Endereço */}
      <Text style={styles.sectionTitle}>📍 Cadastrar Endereço da Loja</Text>
      <TextInput style={styles.input} placeholder="Rua / Avenida" value={noRua} onChangeText={setNoRua} />
      <TextInput style={styles.input} placeholder="Número" value={nrNumero} onChangeText={setNrNumero} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Bairro" value={noBairro} onChangeText={setNoBairro} />
      <TextInput style={styles.input} placeholder="Cidade" value={noCidade} onChangeText={setNoCidade} />
      <TextInput style={styles.input} placeholder="Estado (Ex: SP)" value={sgEstado} onChangeText={setSgEstado} maxLength={2} />
      <TextInput style={styles.input} placeholder="CEP" value={nrCep} onChangeText={setNrCep} keyboardType="numeric" />

      <TouchableOpacity style={styles.buttonSecondary} onPress={handleCadastrarEndereco}>
        <Text style={styles.buttonText}>Salvar Endereço</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Seção de Produtos */}
      <Text style={styles.sectionTitle}>🧱 Cadastrar Material de Construção</Text>
      <TextInput style={styles.input} placeholder="Nome do Produto (Ex: Cimento 50kg)" value={noProduto} onChangeText={setNoProduto} />
      <TextInput style={styles.input} placeholder="Descrição opcional" value={dsProduto} onChangeText={setDsProduto} />
      <TextInput style={styles.input} placeholder="Preço (Ex: 38.50)" value={vlPreco} onChangeText={setVlPreco} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Quantidade em Estoque" value={qtEstoque} onChangeText={setQtEstoque} keyboardType="numeric" />

      <TouchableOpacity style={styles.buttonPrimary} onPress={handleCadastrarProduto}>
        <Text style={styles.buttonText}>Cadastrar Produto</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={() => router.replace('/login')}>
        <Text style={styles.logoutText}>Sair / Voltar ao Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8f9fa', flexGrow: 1, paddingTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#ff5722', marginBottom: 12, marginTop: 5 },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 12, fontSize: 15 },
  buttonPrimary: { backgroundColor: '#ff5722', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  buttonSecondary: { backgroundColor: '#007aff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 15 },
  logoutButton: { alignItems: 'center', marginTop: 10, padding: 10 },
  logoutText: { color: '#d9534f', fontSize: 15, fontWeight: 'bold' }
});