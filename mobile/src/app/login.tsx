import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState<'CLIENTE' | 'DONO_LOJA'>('CLIENTE');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Preencha o e-mail e a senha!");
      return;
    }

    try {
      const response = await fetch('http://192.168.15.8:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao fazer login");
      }

      // Redirecionamento blindado baseado estritamente no tipo de usuário retornado
     if (data.tipoUsuario === 'DONO_LOJA') {
        // Envia o lojaId gerado pelo banco diretamente para a tela de dashboard da loja
        router.replace({
          pathname: '/loja/dashboard',
          params: { lojaId: data.lojaId, nomeLoja: data.nomeLoja || 'Construtora' }
        });
      }

    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível conectar ao servidor.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DiskObra - Acesso</Text>
      <Text style={styles.subtitle}>Entre na sua conta</Text>

      {/* Apenas Cliente e Construtora visíveis */}
      <View style={styles.typeContainer}>
        <TouchableOpacity 
          style={[styles.typeButton, tipoSelecionado === 'CLIENTE' && styles.typeSelected]}
          onPress={() => setTipoSelecionado('CLIENTE')}
        >
          <Text style={[styles.typeText, tipoSelecionado === 'CLIENTE' && styles.typeTextSelected]}>Cliente</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.typeButton, tipoSelecionado === 'DONO_LOJA' && styles.typeSelected]}
          onPress={() => setTipoSelecionado('DONO_LOJA')}
        >
          <Text style={[styles.typeText, tipoSelecionado === 'DONO_LOJA' && styles.typeTextSelected]}>Construtora</Text>
        </TouchableOpacity>
      </View>

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

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
      
      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>Não tem conta?</Text>
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => router.push('/register')}
        >
          <Text style={styles.secondaryButtonText}>Cadastre-se</Text>
        </TouchableOpacity>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f9f9f9' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 5, color: '#333' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#666' },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  typeButton: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center' },
  typeSelected: { backgroundColor: '#FF5722', borderColor: '#FF5722' },
  typeText: { fontSize: 14, color: '#333', fontWeight: '600' },
  typeTextSelected: { color: '#fff' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#FF5722', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  registerContainer: { marginTop: 25, alignItems: 'center' },
  registerText: { color: '#666', marginBottom: 8, fontSize: 14 },
  secondaryButton: { borderWidth: 1, borderColor: '#FF5722', padding: 12, borderRadius: 8, alignItems: 'center', width: '100%' },
  secondaryButtonText: { color: '#FF5722', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 20, alignItems: 'center' },
  backButtonText: { color: '#666', fontSize: 14 },
  catalogButton: { backgroundColor: '#6c757d', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  catalogButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});