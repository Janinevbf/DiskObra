import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

// Conexão do Prisma com Adapter para o PostgreSQL
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Rota de Teste: Listar Lojas
app.get("/lojas", async (req, res) => {
  try {
    const lojas = await prisma.loja.findMany({
      include: { produtos: true, enderecos: true, telefones: true }
    });
    res.json(lojas);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar lojas" });
  }
});

// Rota de Cadastro (Cliente ou Construtora/Loja)
app.post("/register", async (req, res) => {
  try {
    console.log("Dados recebidos no cadastro:", req.body);

    const { nome, email, senha, tipoUsuario, cnpj, nomeLoja } = req.body;

    // Validação básica
    if (!email || !senha || !tipoUsuario) {
      return res.status(400).json({ error: "Preencha os campos obrigatórios." });
    }

    // 1. Verifica se o e-mail já existe
    const usuarioExiste = await prisma.usuario.findUnique({
      where: { noEmail: email },
    });

    if (usuarioExiste) {
      return res.status(400).json({ error: "Este e-mail já está cadastrado." });
    }

    // 2. Se for Dono de Loja/Construtora
    if (tipoUsuario === "DONO_LOJA") {
      if (!cnpj || !nomeLoja) {
        return res.status(400).json({ error: "CNPJ e Nome da Loja são obrigatórios para construtoras." });
      }

      const novaLoja = await prisma.loja.create({
        data: {
          noLoja: nomeLoja,
          nrCnpj: cnpj,
          usuario: {
            create: {
              noEmail: email,
              dsSenha: senha,
              tpUsuario: "DONO_LOJA",
            },
          },
        },
        include: { usuario: true },
      });
      return res.status(201).json({ message: "Construtora/Loja cadastrada com sucesso!", novaLoja });
    } 
    
    // 3. Se for Cliente padrão
    else {
      if (!nome) {
        return res.status(400).json({ error: "O nome é obrigatório para clientes." });
      }

      // Gera um CPF temporário único para evitar erro de duplicidade (@unique)
      const cpfAleatorio = Math.floor(10000000000 + Math.random() * 90000000000).toString();

      const novoCliente = await prisma.cliente.create({
        data: {
          noCliente: nome,
          nrCpf: cpfAleatorio,
          usuario: {
            create: {
              noEmail: email,
              dsSenha: senha,
              tpUsuario: "CLIENTE",
            },
          },
        },
        include: { usuario: true },
      });
      return res.status(201).json({ message: "Cliente cadastrado com sucesso!", novoCliente });
    }

  } catch (error: any) {
    console.error("ERRO COMPLETO DO PRISMA:", error);
    return res.status(500).json({ error: error.message || "Erro interno ao processar o cadastro." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});