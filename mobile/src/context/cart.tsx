import React, { createContext, useContext, useMemo, useState } from 'react';

export interface ItemCarrinho {
  cdProduto: number;
  noProduto: string;
  vlProdutoUnitario: number;
  qtProduto: number;
  qtProdutoEstoque: number;
  idLoja: number;
  noLoja: string;
  nrTelefoneLoja: string;
}

interface CartContextData {
  itens: ItemCarrinho[];
  adicionar: (item: Omit<ItemCarrinho, 'qtProduto'>, quantidade?: number) => boolean;
  alterarQuantidade: (cdProduto: number, quantidade: number) => boolean;
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
      adicionar: (item, quantidade = 1) => {
        const existente = itens.find((i) => i.cdProduto === item.cdProduto);
        const novaQuantidade = (existente?.qtProduto ?? 0) + quantidade;
        if (
          !Number.isInteger(item.qtProdutoEstoque) ||
          item.qtProdutoEstoque <= 0 ||
          !Number.isInteger(quantidade) ||
          quantidade <= 0 ||
          novaQuantidade > item.qtProdutoEstoque
        ) {
          return false;
        }

        setItens((atuais) => {
          if (existente) {
            return atuais.map((i) =>
              i.cdProduto === item.cdProduto
                ? { ...i, ...item, qtProduto: i.qtProduto + quantidade }
                : i
            );
          }
          return [...atuais, { ...item, qtProduto: quantidade }];
        });
        return true;
      },
      alterarQuantidade: (cdProduto, quantidade) => {
        const item = itens.find((i) => i.cdProduto === cdProduto);
        if (quantidade > 0 && item && quantidade > item.qtProdutoEstoque) return false;
        setItens((atuais) =>
          quantidade <= 0
            ? atuais.filter((i) => i.cdProduto !== cdProduto)
            : atuais.map((i) =>
                i.cdProduto === cdProduto ? { ...i, qtProduto: quantidade } : i
              )
        );
        return true;
      },
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
