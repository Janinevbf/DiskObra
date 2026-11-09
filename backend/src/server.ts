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

// 1. Cadastrar Produto para uma Loja específica
app.post("/produtos", async (req, res) => {
  try {
    const { idLoja, noProduto, vlProdutoUnitario, qtProdutoEstoque } = req.body;

    const novoProduto = await prisma.produto.create({
      data: {
        idLoja: Number(idLoja),
        noProduto,
        vlProdutoUnitario: parseFloat(vlProdutoUnitario),
        qtProdutoEstoque: parseInt(qtProdutoEstoque),
      },
    });

    return res.status(201).json({ message: "Produto cadastrado com sucesso!", novoProduto });
  } catch (error) {
    console.error("Erro ao cadastrar produto:", error);
    return res.status(500).json({ error: "Erro ao cadastrar produto." });
  }
});

// 2. Cadastrar Endereço da Loja
app.post("/enderecos", async (req, res) => {
  try {
    const { idLoja, noEndereco, noCidade, sgUf } = req.body;

    const novoEndereco = await prisma.enderecosLoja.create({
      data: {
        idLoja: Number(idLoja),
        noEndereco,
        noCidade,
        sgUf,
      },
    });

    return res.status(201).json({ message: "Endereço cadastrado com sucesso!", novoEndereco });
  } catch (error) {
    console.error("Erro ao cadastrar endereço:", error);
    return res.status(500).json({ error: "Erro ao cadastrar endereço." });
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

    // Se for Dono de Loja/Construtora
 // 2. Se for Dono de Loja/Construtora
    if (tipoUsuario === "DONO_LOJA") {
      const { 
        cnpj, nomeLoja, 
        noEndereco, noCidade, sgUf, 
        nrTelefone 
      } = req.body;

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
          // Cadastra o endereço usando as colunas exatas do schema.prisma
          enderecos: noEndereco ? {
            create: {
              noEndereco,
              noCidade: noCidade || "",
              sgUf: sgUf || "",
            }
          } : undefined,
          // Cadastra o telefone
          telefones: nrTelefone ? {
            create: {
              nrTelefone,
            }
          } : undefined,
        },
        include: { 
          usuario: true, 
          enderecos: true, 
          telefones: true 
        },
      });

      return res.status(201).json({ 
        message: "Construtora cadastrada com sucesso!", 
        novaLoja,
        lojaId: novaLoja.idLoja 
      });
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

// Rota de Login Geral (Cliente, Construtora ou Admin)
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    // Acesso secreto do Administrador
    if (email === "admin@diskobra.com" && senha === "admin123") {
      return res.json({
        message: "Login de Admin realizado com sucesso!",
        tipoUsuario: "ADMIN",
        usuarioId: "admin-master",
        lojaId: null,
      });
    }

    // Busca o usuário pelo e-mail no banco
    const usuario = await prisma.usuario.findUnique({
      where: { noEmail: email },
      include: {
        cliente: true,
        loja: true,
      },
    });

    if (!usuario || usuario.dsSenha !== senha) {
      return res.status(400).json({ error: "E-mail ou senha inválidos." });
    }

    // Retorna o tipo de usuário exato cadastrado no banco
   return res.json({
  message: "Login realizado com sucesso!",
  tipoUsuario: usuario.tpUsuario, 
  usuarioId: usuario.idUsuario,
  lojaId: usuario.loja ? usuario.loja.idLoja : null, // ID da loja vinculado automaticamente
});

  } catch (error: any) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: "Erro interno ao realizar login." });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});