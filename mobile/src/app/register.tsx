import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'CLIENTE' | 'DONO_LOJA'>('CLIENTE');
  
  const [cnpj, setCnpj] = useState('');
  const [nomeLoja, setNomeLoja] = useState('');

  const router = useRouter();

  const handleRegister = async () => {
    if (!nome || !email || !senha) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios!");
      return;
    }

    if (tipoUsuario === 'DONO_LOJA' && (!cnpj || !nomeLoja)) {
      Alert.alert("Atenção", "Preencha o nome da construtora e o CNPJ!");
      return;
    }

    try {
      const response = await fetch('http://192.168.15.8:3000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          email,
          senha,
          tipoUsuario,
          cnpj,
          nomeLoja
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cadastrar");
      }

      Alert.alert("Sucesso!", "Conta criada e salva no banco com sucesso!", [
        { text: "OK", onPress: () => router.replace('/') }
      ]);

    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível conectar ao servidor.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>DiskObra - Cadastro</Text>
      <Text style={styles.subtitle}>Crie sua conta para começar</Text>

      <View style={styles.typeContainer}>
        <TouchableOpacity 
          style={[styles.typeButton, tipoUsuario === 'CLIENTE' && styles.typeSelected]}
          onPress={() => setTipoUsuario('CLIENTE')}
        >
          <Text style={[styles.typeText, tipoUsuario === 'CLIENTE' && styles.typeTextSelected]}>Sou Cliente</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.typeButton, tipoUsuario === 'DONO_LOJA' && styles.typeSelected]}
          onPress={() => setTipoUsuario('DONO_LOJA')}
        >
          <Text style={[styles.typeText, tipoUsuario === 'DONO_LOJA' && styles.typeTextSelected]}>Construtora</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nome Completo"
        placeholderTextColor="#888"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      {tipoUsuario === 'DONO_LOJA' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nome da Construtora / Loja"
            placeholderTextColor="#888"
            value={nomeLoja}
            onChangeText={setNomeLoja}
          />
          <TextInput
            style={styles.input}
            placeholder="CNPJ"
            placeholderTextColor="#888"
            value={cnpj}
            onChangeText={setCnpj}
            keyboardType="numeric"
          />
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Cadastrar</Text>
      </TouchableOpacity>

      {/* Força a rota raiz sem chamar router.back() */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
        <Text style={styles.backButtonText}>Voltar para o Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#333' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 25, color: '#666' },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  typeButton: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  typeSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  typeText: { fontSize: 14, color: '#333', fontWeight: '600' },
  typeTextSelected: { color: '#fff' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 15, alignItems: 'center' },
  backButtonText: { color: '#007AFF', fontSize: 15, fontWeight: '600' }
});