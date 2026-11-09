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

// Buscar uma Loja específica (com produtos, endereço e telefone)
app.get("/lojas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID da loja inválido." });
    }

    const loja = await prisma.loja.findUnique({
      where: { idLoja: id },
      include: {
        produtos: true,
        enderecos: true,
        telefones: true,
        usuario: { select: { idUsuario: true, noEmail: true, tpUsuario: true } },
      },
    });

    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada." });
    }

    return res.json(loja);
  } catch (error) {
    console.error("Erro ao buscar loja:", error);
    return res.status(500).json({ error: "Erro ao buscar loja." });
  }
});

// Atualizar dados da Loja (nome, CNPJ, telefone e endereço)
app.put("/lojas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID da loja inválido." });
    }

    const { noLoja, nrCnpj, nrTelefone, noEndereco, noCidade, sgUf } = req.body;

    const loja = await prisma.loja.findUnique({
      where: { idLoja: id },
      include: { telefones: true, enderecos: true },
    });

    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada." });
    }

    await prisma.$transaction(async (tx) => {
      const dadosLoja: { noLoja?: string; nrCnpj?: string } = {};
      if (noLoja !== undefined) dadosLoja.noLoja = noLoja;
      if (nrCnpj !== undefined) dadosLoja.nrCnpj = nrCnpj;

      if (Object.keys(dadosLoja).length > 0) {
        await tx.loja.update({ where: { idLoja: id }, data: dadosLoja });
      }

      if (nrTelefone !== undefined) {
        const telefone = loja.telefones[0];
        if (telefone) {
          await tx.telefoneLoja.update({
            where: { idTelefoneLoja: telefone.idTelefoneLoja },
            data: { nrTelefone },
          });
        } else {
          await tx.telefoneLoja.create({ data: { idLoja: id, nrTelefone } });
        }
      }

      if (noEndereco !== undefined || noCidade !== undefined || sgUf !== undefined) {
        const endereco = loja.enderecos[0];
        if (endereco) {
          await tx.enderecosLoja.update({
            where: { idEnderecoLoja: endereco.idEnderecoLoja },
            data: {
              noEndereco: noEndereco ?? endereco.noEndereco,
              noCidade: noCidade ?? endereco.noCidade,
              sgUf: sgUf ?? endereco.sgUf,
            },
          });
        } else {
          await tx.enderecosLoja.create({
            data: {
              idLoja: id,
              noEndereco: noEndereco ?? "",
              noCidade: noCidade ?? "",
              sgUf: sgUf ?? "",
            },
          });
        }
      }
    });

    const atualizada = await prisma.loja.findUnique({
      where: { idLoja: id },
      include: { produtos: true, enderecos: true, telefones: true },
    });

    return res.json({ message: "Loja atualizada com sucesso!", loja: atualizada });
  } catch (error) {
    console.error("Erro ao atualizar loja:", error);
    return res.status(500).json({ error: "Erro ao atualizar loja." });
  }
});

// Listar pedidos que contêm produtos da loja
app.get("/lojas/:id/pedidos", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID da loja inválido." });
    }

    const pedidos = await prisma.venda.findMany({
      where: { produtos: { some: { produto: { idLoja: id } } } },
      orderBy: { idVenda: "desc" },
      include: {
        cliente: {
          include: {
            usuario: { select: { noEmail: true } },
            telefones: true,
          },
        },
        produtos: {
          where: { produto: { idLoja: id } },
          include: { produto: { select: { noProduto: true } } },
        },
      },
    });

    return res.json(pedidos);
  } catch (error) {
    console.error("Erro ao buscar pedidos da loja:", error);
    return res.status(500).json({ error: "Erro ao buscar pedidos da loja." });
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

// Atualizar um Produto
app.put("/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID do produto inválido." });
    }

    const { noProduto, vlProdutoUnitario, qtProdutoEstoque } = req.body;

    const data: {
      noProduto?: string;
      vlProdutoUnitario?: number;
      qtProdutoEstoque?: number;
    } = {};

    if (noProduto !== undefined) data.noProduto = noProduto;
    if (vlProdutoUnitario !== undefined) data.vlProdutoUnitario = parseFloat(vlProdutoUnitario);
    if (qtProdutoEstoque !== undefined) data.qtProdutoEstoque = parseInt(qtProdutoEstoque);

    const produto = await prisma.produto.update({
      where: { cdProduto: id },
      data,
    });

    return res.json({ message: "Produto atualizado com sucesso!", produto });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return res.status(500).json({ error: "Erro ao atualizar produto." });
  }
});

// Remover um Produto
app.delete("/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID do produto inválido." });
    }

    await prisma.produto.delete({ where: { cdProduto: id } });
    return res.json({ message: "Produto removido com sucesso!" });
  } catch (error) {
    console.error("Erro ao remover produto:", error);
    return res.status(500).json({ error: "Erro ao remover produto." });
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

// Buscar dados do cliente (endereço e telefone)
app.get("/clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { idCliente: id },
      include: {
        enderecos: true,
        telefones: true,
        usuario: { select: { noEmail: true } },
      },
    });

    if (!cliente) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    return res.json(cliente);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return res.status(500).json({ error: "Erro ao buscar cliente." });
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
        tipoUsuario: "DONO_LOJA",
        usuarioId: novaLoja.usuario?.idUsuario ?? null,
        lojaId: novaLoja.idLoja,
        nome: novaLoja.noLoja,
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
      return res.status(201).json({
        message: "Cliente cadastrado com sucesso!",
        novoCliente,
        tipoUsuario: "CLIENTE",
        usuarioId: novoCliente.usuario?.idUsuario ?? null,
        clienteId: novoCliente.idCliente,
        nome: novoCliente.noCliente,
      });
    }

  } catch (error: any) {
    console.error("ERRO COMPLETO DO PRISMA:", error);
    return res.status(500).json({ error: error.message || "Erro interno ao processar o cadastro." });
  }
});

// Criar pedido (venda) do cliente
app.post("/pedidos", async (req, res) => {
  try {
    const {
      idCliente,
      itens,
      tpPagamento,
      noEnderecoEntrega,
      noCidadeEntrega,
      sgUfEntrega,
    } = req.body;

    if (!idCliente || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Cliente e itens do pedido são obrigatórios." });
    }

    if (!noEnderecoEntrega || !noCidadeEntrega || !sgUfEntrega) {
      return res.status(400).json({ error: "Informe o endereço completo de entrega." });
    }

    if (!tpPagamento) {
      return res.status(400).json({ error: "Informe a forma de pagamento." });
    }

    const clienteId = Number(idCliente);
    const endereco = String(noEnderecoEntrega).trim();
    const cidade = String(noCidadeEntrega).trim();
    const uf = String(sgUfEntrega).trim().toUpperCase().slice(0, 2);

    const total = itens.reduce(
      (soma: number, item: any) => soma + Number(item.vlTotalProduto),
      0
    );

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          idCliente: clienteId,
          vlTotalVenda: total,
          icPago: 0,
          tpPagamento,
          noEnderecoEntrega: endereco,
          noCidadeEntrega: cidade,
          sgUfEntrega: uf,
          produtos: {
            create: itens.map((item: any) => ({
              cdProduto: Number(item.cdProduto),
              qtProdutoRetirado: Number(item.qtProdutoRetirado),
              vlTotalProduto: Number(item.vlTotalProduto),
            })),
          },
        },
        include: { produtos: true },
      });

      for (const item of itens) {
        await tx.produto.update({
          where: { cdProduto: Number(item.cdProduto) },
          data: { qtProdutoEstoque: { decrement: Number(item.qtProdutoRetirado) } },
        });
      }

      const enderecoExistente = await tx.enderecoCliente.findFirst({
        where: { idCliente: clienteId },
      });

      if (enderecoExistente) {
        await tx.enderecoCliente.update({
          where: { idEnderecoCliente: enderecoExistente.idEnderecoCliente },
          data: { noEndereco: endereco, noCidade: cidade, sgUf: uf },
        });
      } else {
        await tx.enderecoCliente.create({
          data: {
            idCliente: clienteId,
            noEndereco: endereco,
            noCidade: cidade,
            sgUf: uf,
          },
        });
      }

      return novaVenda;
    });

    return res.status(201).json({ message: "Pedido realizado com sucesso!", venda });
  } catch (error: any) {
    console.error("Erro ao criar pedido:", error);
    return res.status(500).json({ error: error.message || "Erro ao criar pedido." });
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

    // Busca o usuário pelo e-mail no banco incluindo cliente e loja
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

    return res.json({
      message: "Login realizado com sucesso!",
      tipoUsuario: usuario.tpUsuario, 
      usuarioId: usuario.idUsuario,
      email: usuario.noEmail,
      lojaId: usuario.loja ? usuario.loja.idLoja : null,
      clienteId: usuario.cliente ? usuario.cliente.idCliente : null,
      nome: usuario.loja?.noLoja ?? usuario.cliente?.noCliente ?? usuario.noEmail,
    });

  } catch (error: any) {
    console.error("Erro no login:", error);
    return res.status(500).json({ error: "Erro interno ao realizar login." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Backend rodando na porta ${PORT}`);
});