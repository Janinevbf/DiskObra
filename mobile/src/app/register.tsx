import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { API_URL } from '../config/api';
import { useAuth } from '../context/auth';

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'CLIENTE' | 'DONO_LOJA'>('CLIENTE');
  
  // Campos específicos da Construtora / Loja
  const [nomeLoja, setNomeLoja] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nrTelefone, setNrTelefone] = useState('');
  
  // Campos de Endereço compatíveis com o seu Banco (EnderecosLoja)
  const [noEndereco, setNoEndereco] = useState(''); // Rua, Número e Bairro juntos
  const [noCidade, setNoCidade] = useState('');
  const [sgUf, setSgUf] = useState('');

  const router = useRouter();
  const { entrar } = useAuth();

  const handleRegister = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha e-mail e senha!");
      return;
    }

    if (tipoUsuario === 'DONO_LOJA' && (!nomeLoja || !cnpj)) {
      Alert.alert("Atenção", "Preencha o Nome da Construtora e o CNPJ!");
      return;
    }

    if (tipoUsuario === 'CLIENTE' && !nome) {
      Alert.alert("Atenção", "Preencha o seu nome!");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: tipoUsuario === 'CLIENTE' ? nome : '',
          email,
          senha,
          tipoUsuario,
          cnpj,
          nomeLoja,
          nrTelefone,
          noEndereco, 
          noCidade,
          sgUf,       
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      entrar({
        usuarioId: data.usuarioId ?? null,
        tipoUsuario: data.tipoUsuario ?? tipoUsuario,
        email,
        nome: data.nome ?? nome,
        lojaId: data.lojaId ?? null,
        clienteId: data.clienteId ?? null,
      });

      Alert.alert(
        "Sucesso!",
        data.tipoUsuario === 'DONO_LOJA'
          ? "Construtora cadastrada com sucesso! Bem-vindo ao painel."
          : "Cliente cadastrado com sucesso! Bem-vindo ao catálogo.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace(
                (data.tipoUsuario === 'DONO_LOJA' ? '/loja' : '/cliente') as any
              ),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao registrar.");
    }
  }; 

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Conta - DiskObra</Text>

      {/* Seletor de Tipo */}
      <View style={styles.typeContainer}>
        <TouchableOpacity 
          style={[styles.typeButton, tipoUsuario === 'CLIENTE' && styles.typeSelected]}
          onPress={() => setTipoUsuario('CLIENTE')}
        >
          <Text style={[styles.typeText, tipoUsuario === 'CLIENTE' && styles.typeTextSelected]}>Cliente</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.typeButton, tipoUsuario === 'DONO_LOJA' && styles.typeSelected]}
          onPress={() => setTipoUsuario('DONO_LOJA')}
        >
          <Text style={[styles.typeText, tipoUsuario === 'DONO_LOJA' && styles.typeTextSelected]}>Construtora</Text>
        </TouchableOpacity>
      </View>

      {/* Campos dinâmicos baseados no tipo */}
      {tipoUsuario === 'CLIENTE' ? (
        <TextInput style={styles.input} placeholder="Seu Nome Completo" value={nome} onChangeText={setNome} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Dados da Empresa</Text>
          <TextInput style={styles.input} placeholder="Nome da Construtora / Loja" value={nomeLoja} onChangeText={setNomeLoja} />
          <TextInput style={styles.input} placeholder="CNPJ (Ex: 00.000.000/0001-00)" value={cnpj} onChangeText={setCnpj} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Telefone / WhatsApp de Contato" value={nrTelefone} onChangeText={setNrTelefone} keyboardType="phone-pad" />

          <Text style={styles.sectionTitle}>Endereço da Loja</Text>
          <TextInput style={styles.input} placeholder="Endereço Completo (Rua, Nº, Bairro)" value={noEndereco} onChangeText={setNoEndereco} />
          <TextInput style={styles.input} placeholder="Cidade" value={noCidade} onChangeText={setNoCidade} />
          <TextInput style={styles.input} placeholder="UF (Ex: SP)" value={sgUf} onChangeText={setSgUf} maxLength={2} autoCapitalize="characters" />
        </>
      )}

      <Text style={styles.sectionTitle}>Acesso</Text>
      <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Senha" value={senha} onChangeText={setSenha} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>
          {tipoUsuario === 'DONO_LOJA' ? 'Cadastrar Construtora' : 'Criar Conta'}
        </Text>
      </TouchableOpacity>

      {/* Botão extra para ir para o Catálogo */}
      <TouchableOpacity 
        style={styles.catalogButton} 
        onPress={() => router.replace('/')}
      >
        <Text style={styles.catalogButtonText}> Catálogo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Voltar ao Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
   
  
const styles = StyleSheet.create({
 container: { padding: 20, backgroundColor: '#f9f9f9', flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#FF5722', marginBottom: 10, marginTop: 10 },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  typeButton: { flex: 1, paddingVertical: 12, marginHorizontal: 4, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  typeSelected: { backgroundColor: '#FF5722', borderColor: '#FF5722' },
  typeText: { fontSize: 14, color: '#333', fontWeight: '600' },
  typeTextSelected: { color: '#fff' },
  input: { backgroundColor: '#fff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 12, fontSize: 15 },
  button: { backgroundColor: '#FF5722', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 20, alignItems: 'center', marginBottom: 20 },
  backButtonText: { color: '#666', fontSize: 14 },
  catalogButton: { backgroundColor: '#6c757d', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  catalogButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
})
  