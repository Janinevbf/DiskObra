import React, { createContext, useContext, useMemo, useState } from 'react';

export interface ItemCarrinho {
  cdProduto: number;
  noProduto: string;
  vlProdutoUnitario: number;
  qtProduto: number;
  idLoja: number;
  noLoja: string;
}

interface CartContextData {
  itens: ItemCarrinho[];
  adicionar: (item: Omit<ItemCarrinho, 'qtProduto'>, quantidade?: number) => void;
  alterarQuantidade: (cdProduto: number, quantidade: number) => void;
  remover: (cdProduto: number) => void;
  limpar: () => void;
  total: number;
  quantidadeTotal: number;
}

const CartContext = createContext<CartContextData | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);

  const value = useMemo<CartContextData>(() => {
    const total = itens.reduce(
      (soma, item) => soma + item.vlProdutoUnitario * item.qtProduto,
      0
    );
    const quantidadeTotal = itens.reduce((soma, item) => soma + item.qtProduto, 0);

    return {
      itens,
      total,
      quantidadeTotal,
      adicionar: (item, quantidade = 1) =>
        setItens((atuais) => {
          const existente = atuais.find((i) => i.cdProduto === item.cdProduto);
          if (existente) {
            return atuais.map((i) =>
              i.cdProduto === item.cdProduto
                ? { ...i, qtProduto: i.qtProduto + quantidade }
                : i
            );
          }
          return [...atuais, { ...item, qtProduto: quantidade }];
        }),
      alterarQuantidade: (cdProduto, quantidade) =>
        setItens((atuais) =>
          quantidade <= 0
            ? atuais.filter((i) => i.cdProduto !== cdProduto)
            : atuais.map((i) =>
                i.cdProduto === cdProduto ? { ...i, qtProduto: quantidade } : i
              )
        ),
      remover: (cdProduto) =>
        setItens((atuais) => atuais.filter((i) => i.cdProduto !== cdProduto)),
      limpar: () => setItens([]),
    };
  }, [itens]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider');
  }
  return context;
}
