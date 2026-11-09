import { router } from 'expo-router';
import React, { createContext, useContext, useMemo, useState } from 'react';

export type TipoUsuario = 'CLIENTE' | 'DONO_LOJA' | 'ADMIN';

export interface Sessao {
  usuarioId: number | string | null;
  tipoUsuario: TipoUsuario;
  email: string;
  nome: string;
  lojaId: number | null;
  clienteId: number | null;
}

interface AuthContextData {
  sessao: Sessao | null;
  entrar: (sessao: Sessao) => void;
  sair: () => void;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);

  const value = useMemo<AuthContextData>(
    () => ({
      sessao,
      entrar: (novaSessao) => setSessao(novaSessao),
      sair: () => {
        setSessao(null);
        router.replace('/login');
      },
    }),
    [sessao]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
