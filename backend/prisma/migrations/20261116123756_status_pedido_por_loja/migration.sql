-- CreateTable
CREATE TABLE "TB_STATUS_PEDIDO_LOJA" (
    "idStatusPedidoLoja" SERIAL NOT NULL,
    "idVenda" INTEGER NOT NULL,
    "idLoja" INTEGER NOT NULL,
    "tpStatusPedido" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "dsMotivoNegado" VARCHAR(255),
    "dhAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TB_STATUS_PEDIDO_LOJA_pkey" PRIMARY KEY ("idStatusPedidoLoja")
);

-- CreateIndex
CREATE UNIQUE INDEX "TB_STATUS_PEDIDO_LOJA_idVenda_idLoja_key" ON "TB_STATUS_PEDIDO_LOJA"("idVenda", "idLoja");

-- AddForeignKey
ALTER TABLE "TB_STATUS_PEDIDO_LOJA" ADD CONSTRAINT "TB_STATUS_PEDIDO_LOJA_idVenda_fkey" FOREIGN KEY ("idVenda") REFERENCES "TB_VENDA"("idVenda") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TB_STATUS_PEDIDO_LOJA" ADD CONSTRAINT "TB_STATUS_PEDIDO_LOJA_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "TB_LOJA"("idLoja") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the current order status separately for every participating store.
INSERT INTO "TB_STATUS_PEDIDO_LOJA" ("idVenda", "idLoja", "tpStatusPedido", "dsMotivoNegado")
SELECT DISTINCT pv."idVenda", p."idLoja", v."tpStatusPedido", v."dsMotivoNegado"
FROM "TB_PRODUTO_VENDA" pv
JOIN "TB_PRODUTO" p ON p."cdProduto" = pv."cdProduto"
JOIN "TB_VENDA" v ON v."idVenda" = pv."idVenda"
ON CONFLICT ("idVenda", "idLoja") DO NOTHING;
