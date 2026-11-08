-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('CLIENTE', 'ADMIN', 'DONO_LOJA');

-- CreateTable
CREATE TABLE "TB_USUARIO" (
    "idUsuario" SERIAL NOT NULL,
    "noEmail" VARCHAR(150) NOT NULL,
    "dsSenha" VARCHAR(255) NOT NULL,
    "tpUsuario" "TipoUsuario" NOT NULL DEFAULT 'CLIENTE',
    "idCliente" INTEGER,
    "idLoja" INTEGER,

    CONSTRAINT "TB_USUARIO_pkey" PRIMARY KEY ("idUsuario")
);

-- CreateIndex
CREATE UNIQUE INDEX "TB_USUARIO_noEmail_key" ON "TB_USUARIO"("noEmail");

-- CreateIndex
CREATE UNIQUE INDEX "TB_USUARIO_idCliente_key" ON "TB_USUARIO"("idCliente");

-- CreateIndex
CREATE UNIQUE INDEX "TB_USUARIO_idLoja_key" ON "TB_USUARIO"("idLoja");

-- AddForeignKey
ALTER TABLE "TB_USUARIO" ADD CONSTRAINT "TB_USUARIO_idCliente_fkey" FOREIGN KEY ("idCliente") REFERENCES "TB_CLIENTE"("idCliente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TB_USUARIO" ADD CONSTRAINT "TB_USUARIO_idLoja_fkey" FOREIGN KEY ("idLoja") REFERENCES "TB_LOJA"("idLoja") ON DELETE SET NULL ON UPDATE CASCADE;
