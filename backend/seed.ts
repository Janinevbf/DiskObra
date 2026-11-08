import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Configura o pool de conexão e o adapter exigidos pelo Prisma 7+
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(" Iniciando o semeamento do banco de dados...");

  // 1. Criar uma Loja de Exemplo
  const loja = await prisma.loja.create({
    data: {
      noLoja: "Depósito São José de Materiais",
      nrCnpj: "12.345.678/0001-99",
      enderecos: {
        create: {
          sgUf: "SP",
          noEndereco: "Av. Principal, 1500",
          noCidade: "Guarulhos",
        },
      },
      telefones: {
        create: {
          nrTelefone: "(11) 98765-4321",
        },
      },
    },
  });

  // 2. Criar Produtos para essa Loja
  const cimento = await prisma.produto.create({
    data: {
      idLoja: loja.idLoja,
      noProduto: "Cimento CP II (Saco 50kg)",
      qtProdutoEstoque: 100,
      vlProdutoUnitario: 35.90,
    },
  });

  const tijolo = await prisma.produto.create({
    data: {
      idLoja: loja.idLoja,
      noProduto: "Tijolo 8 Furos (Milheiro)",
      qtProdutoEstoque: 5000,
      vlProdutoUnitario: 950.00,
    },
  });

  // 3. Criar um Cliente de Exemplo
  const cliente = await prisma.cliente.create({
    data: {
      noCliente: "Carlos Eduardo da Silva",
      nrCpf: "12345678901",
      enderecos: {
        create: {
          sgUf: "SP",
          noEndereco: "Rua das Flores, 45",
          noCidade: "Guarulhos",
        },
      },
      telefones: {
        create: {
          nrTelefone: "(11) 91234-5678",
        },
      },
    },
  });

  // 4. Registrar uma Venda de Exemplo
  await prisma.venda.create({
    data: {
      idCliente: cliente.idCliente,
      vlTotalVenda: 1057.80,
      icPago: 1, // Pago
      tpPagamento: "Pix",
      dhPagamento: new Date(),
      produtos: {
        create: [
          {
            cdProduto: cimento.cdProduto,
            qtProdutoRetirado: 2,
            vlTotalProduto: 71.80,
          },
          {
            cdProduto: tijolo.cdProduto,
            qtProdutoRetirado: 1,
            vlTotalProduto: 950.00,
          },
        ],
      },
    },
  });

  console.log(" Dados de teste inseridos com sucesso!");
}

main()
  .catch((e) => {
    console.error(" Erro ao popular o banco:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Fecha o pool do pg para encerrar o processo limpinho
  });