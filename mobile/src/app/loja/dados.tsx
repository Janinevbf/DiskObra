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

export default function LojaDados() {
  const { sessao, sair } = useAuth();
  const lojaId = sessao?.lojaId ?? null;

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [noLoja, setNoLoja] = useState('');
  const [nrCnpj, setNrCnpj] = useState('');
  const [nrTelefone, setNrTelefone] = useState('');
  const [noEndereco, setNoEndereco] = useState('');
  const [noCidade, setNoCidade] = useState('');
  const [sgUf, setSgUf] = useState('');

  const carregar = useCallback(async () => {
    if (!lojaId) {
      setErro('Esta conta não está vinculada a uma loja. Saia e entre novamente ou confira o cadastro da loja.');
      setCarregando(false);
      return;
    }
    setErro(null);
    try {
      const response = await fetch(`${API_URL}/lojas/${lojaId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar dados.');

      setNoLoja(data.noLoja ?? '');
      setNrCnpj(data.nrCnpj ?? '');
      setNrTelefone(data.telefones?.[0]?.nrTelefone ?? '');
      setNoEndereco(data.enderecos?.[0]?.noEndereco ?? '');
      setNoCidade(data.enderecos?.[0]?.noCidade ?? '');
      setSgUf(data.enderecos?.[0]?.sgUf ?? '');
    } catch (error: any) {
      setErro(error.message || 'Não foi possível conectar à API.');
      Alert.alert('Erro', error.message || 'Não foi possível carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, [lojaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const salvar = async () => {
    if (!lojaId) {
      setErro('Esta conta não está vinculada a uma loja. Saia e entre novamente.');
      return;
    }
    if (!noLoja || !nrCnpj) {
      Alert.alert('Atenção', 'Nome da loja e CNPJ são obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch(`${API_URL}/lojas/${lojaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noLoja, nrCnpj, nrTelefone, noEndereco, noCidade, sgUf }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar os dados.');

      Alert.alert('Sucesso!', 'Dados da loja atualizados.');
      setErro(null);
    } catch (error: any) {
      setErro(error.message || 'Não foi possível conectar à API.');
      Alert.alert('Erro', error.message || 'Não foi possível salvar os dados.');
    } finally {
      setSalvando(false);
    }
  };

  const handleSair = () => {
    sair();
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Minha Loja</Text>
        <TouchableOpacity onPress={handleSair}>
          <Text style={styles.sair}>Sair</Text>
        </TouchableOpacity>
      </View>

      {erro ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{erro}</Text>
          <Text style={styles.errorDetails}>API: {API_URL} · Loja: {lojaId ?? 'não vinculada'}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Dados da empresa</Text>
      <TextInput style={styles.input} placeholder="Nome da loja" value={noLoja} onChangeText={setNoLoja} />
      <TextInput style={styles.input} placeholder="CNPJ" value={nrCnpj} onChangeText={setNrCnpj} />
      <TextInput
        style={styles.input}
        placeholder="Telefone / WhatsApp"
        value={nrTelefone}
        onChangeText={setNrTelefone}
        keyboardType="phone-pad"
      />

      <View style={styles.readonlyBox}>
        <Text style={styles.readonlyLabel}>E-mail de acesso</Text>
        <Text style={styles.readonlyValue}>{sessao?.email ?? '-'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Endereço</Text>
      <TextInput
        style={styles.input}
        placeholder="Endereço completo (Rua, nº, bairro)"
        value={noEndereco}
        onChangeText={setNoEndereco}
      />
      <TextInput style={styles.input} placeholder="Cidade" value={noCidade} onChangeText={setNoCidade} />
      <TextInput
        style={styles.input}
        placeholder="UF (Ex: SP)"
        value={sgUf}
        onChangeText={setSgUf}
        maxLength={2}
        autoCapitalize="characters"
      />

      <TouchableOpacity
        style={[styles.button, salvando && styles.buttonDisabled]}
        disabled={salvando}
        onPress={salvar}>
        <Text style={styles.buttonText}>{salvando ? 'Salvando...' : 'Salvar dados'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  container: { padding: 20, paddingTop: 40, backgroundColor: '#f8f9fa', flexGrow: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
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
  readonlyBox: {
    backgroundColor: '#eef1f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  readonlyLabel: { fontSize: 12, color: '#777' },
  readonlyValue: { fontSize: 14, color: '#333', fontWeight: '600', marginTop: 2 },
  button: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorBox: { backgroundColor: '#fff0f0', borderColor: '#e6b8b8', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12 },
  errorText: { color: '#9b2525', fontSize: 13, lineHeight: 19 },
  errorDetails: { color: '#7b5050', fontSize: 11, marginTop: 6 },
});
