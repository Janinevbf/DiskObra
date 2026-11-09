import Constants from 'expo-constants';

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '');
  }

  // Em dispositivo físico/emulador, "localhost" aponta para o próprio aparelho.
  // Usamos o host do servidor de desenvolvimento do Expo (mesmo IP da máquina).
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:3000`;
  }

  return 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();
