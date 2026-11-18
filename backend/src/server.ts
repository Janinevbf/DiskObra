import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendDirectory, ".env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use((req, res, next) => {
  const inicio = Date.now();
  res.on("finish", () => {
    console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - inicio}ms)`);
  });
  next();
});

const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads/produtos");
const lojaLogoDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads/lojas");
app.use("/uploads/produtos", express.static(uploadDirectory, { maxAge: "1d" }));
app.use("/uploads/lojas", express.static(lojaLogoDirectory, { maxAge: "1d" }));

// Conexão do Prisma com Adapter para o PostgreSQL
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const resetTokenSecret = process.env.RESET_TOKEN_SECRET || (process.env.NODE_ENV === "production" ? "" : randomBytes(32).toString("hex"));

const hashSenha = (senha: string) => createHash("sha256").update(senha).digest();
const criarTokenRedefinicao = (idUsuario: number, senhaAtual: string) => {
  const payload = Buffer.from(JSON.stringify({
    idUsuario,
    exp: Date.now() + 30 * 60 * 1000,
    versaoSenha: hashSenha(senhaAtual).toString("hex"),
  })).toString("base64url");
  const assinatura = createHmac("sha256", resetTokenSecret).update(payload).digest("base64url");
  return `${payload}.${assinatura}`;
};

const lerTokenRedefinicao = (token: string) => {
  const [payload, assinatura, extra] = token.split(".");
  if (!payload || !assinatura || extra !== undefined || !resetTokenSecret) return null;
  const assinaturaEsperada = createHmac("sha256", resetTokenSecret).update(payload).digest();
  let assinaturaRecebida: Buffer;
  try {
    assinaturaRecebida = Buffer.from(assinatura, "base64url");
  } catch {
    return null;
  }
  if (assinaturaRecebida.length !== assinaturaEsperada.length || !timingSafeEqual(assinaturaRecebida, assinaturaEsperada)) return null;
  try {
    const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isInteger(dados.idUsuario) || dados.idUsuario <= 0 || !Number.isFinite(dados.exp) || dados.exp <= Date.now() || !/^[a-f0-9]{64}$/i.test(dados.versaoSenha)) return null;
    return dados as { idUsuario: number; exp: number; versaoSenha: string };
  } catch {
    return null;
  }
};

class EstoqueIndisponivelError extends Error {
  statusCode = 409;
}

class PedidoMultiplasLojasError extends Error {
  statusCode = 400;
}

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

    const {
      noLoja,
      nrCnpj,
      nrTelefone,
      noEndereco,
      noCidade,
      sgUf,
      nrNumero,
      nrCep,
      email,
      hrAbertura,
      hrFechamento,
      diasFuncionamento,
      icAbreFeriados,
    } = req.body;

    const diasPermitidos = new Set(["seg", "ter", "qua", "qui", "sex", "sab", "dom"]);
    if (diasFuncionamento !== undefined && (
      !Array.isArray(diasFuncionamento) ||
      diasFuncionamento.some(dia => typeof dia !== "string" || !diasPermitidos.has(dia)) ||
      new Set(diasFuncionamento).size !== diasFuncionamento.length
    )) {
      return res.status(400).json({ error: "Selecione dias de funcionamento válidos." });
    }
    if (icAbreFeriados !== undefined && typeof icAbreFeriados !== "boolean") {
      return res.status(400).json({ error: "Informe se a loja abre em feriados." });
    }

    let aberturaNormalizada: string | null | undefined;
    let fechamentoNormalizado: string | null | undefined;
    if (hrAbertura !== undefined || hrFechamento !== undefined) {
      const abertura = typeof hrAbertura === "string" ? hrAbertura.trim() : hrAbertura;
      const fechamento = typeof hrFechamento === "string" ? hrFechamento.trim() : hrFechamento;
      const formatoHora = /^([01]\d|2[0-3]):[0-5]\d$/;
      if ((abertura && (typeof abertura !== "string" || !formatoHora.test(abertura))) ||
          (fechamento && (typeof fechamento !== "string" || !formatoHora.test(fechamento)))) {
        return res.status(400).json({ error: "Informe horários válidos no formato HH:MM." });
      }
      if (Boolean(abertura) !== Boolean(fechamento) || (abertura && fechamento && abertura === fechamento)) {
        return res.status(400).json({ error: "Informe horários de abertura e fechamento diferentes." });
      }
      if (Array.isArray(diasFuncionamento) && diasFuncionamento.length && (!abertura || !fechamento)) {
        return res.status(400).json({ error: "Informe os horários de abertura e fechamento para os dias selecionados." });
      }
      aberturaNormalizada = abertura || null;
      fechamentoNormalizado = fechamento || null;
    }

    const loja = await prisma.loja.findUnique({
      where: { idLoja: id },
      include: { telefones: true, enderecos: true, usuario: true },
    });

    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada." });
    }

    const diasEfetivos = diasFuncionamento ?? loja.diasFuncionamento;
    const aberturaEfetiva = aberturaNormalizada !== undefined ? aberturaNormalizada : loja.hrAbertura;
    const fechamentoEfetivo = fechamentoNormalizado !== undefined ? fechamentoNormalizado : loja.hrFechamento;
    if (diasEfetivos.length && (!aberturaEfetiva || !fechamentoEfetivo)) {
      return res.status(400).json({ error: "Informe os horários de abertura e fechamento para os dias selecionados." });
    }

    if (email !== undefined && email !== loja.usuario?.noEmail) {
      const existe = await prisma.usuario.findUnique({ where: { noEmail: email } });
      if (existe && existe.idUsuario !== loja.usuario?.idUsuario) {
        return res.status(400).json({ error: "Este e-mail já está em uso." });
      }
    }

    await prisma.$transaction(async (tx) => {
      const dadosLoja: {
        noLoja?: string;
        nrCnpj?: string;
        hrAbertura?: string | null;
        hrFechamento?: string | null;
        diasFuncionamento?: string[];
        icAbreFeriados?: boolean;
      } = {};
      if (noLoja !== undefined) dadosLoja.noLoja = noLoja;
      if (nrCnpj !== undefined) dadosLoja.nrCnpj = nrCnpj;
      if (aberturaNormalizada !== undefined) dadosLoja.hrAbertura = aberturaNormalizada;
      if (fechamentoNormalizado !== undefined) dadosLoja.hrFechamento = fechamentoNormalizado;
      if (diasFuncionamento !== undefined) dadosLoja.diasFuncionamento = diasFuncionamento;
      if (icAbreFeriados !== undefined) dadosLoja.icAbreFeriados = icAbreFeriados;

      if (Object.keys(dadosLoja).length > 0) {
        await tx.loja.update({ where: { idLoja: id }, data: dadosLoja });
      }

      if (email !== undefined && loja.usuario) {
        await tx.usuario.update({
          where: { idUsuario: loja.usuario.idUsuario },
          data: { noEmail: email },
        });
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

      if (
        noEndereco !== undefined ||
        noCidade !== undefined ||
        sgUf !== undefined ||
        nrNumero !== undefined ||
        nrCep !== undefined
      ) {
        const endereco = loja.enderecos[0];
        if (endereco) {
          await tx.enderecosLoja.update({
            where: { idEnderecoLoja: endereco.idEnderecoLoja },
            data: {
              noEndereco: noEndereco ?? endereco.noEndereco,
              noCidade: noCidade ?? endereco.noCidade,
              sgUf: sgUf ?? endereco.sgUf,
              nrNumero: nrNumero ?? endereco.nrNumero,
              nrCep: nrCep ?? endereco.nrCep,
            },
          });
        } else {
          await tx.enderecosLoja.create({
            data: {
              idLoja: id,
              noEndereco: noEndereco ?? "",
              noCidade: noCidade ?? "",
              sgUf: sgUf ?? "",
              nrNumero: nrNumero ?? null,
              nrCep: nrCep ?? null,
            },
          });
        }
      }
    });

    const atualizada = await prisma.loja.findUnique({
      where: { idLoja: id },
      include: {
        produtos: true,
        enderecos: true,
        telefones: true,
        usuario: { select: { idUsuario: true, noEmail: true, tpUsuario: true } },
      },
    });

    return res.json({ message: "Loja atualizada com sucesso!", loja: atualizada });
  } catch (error) {
    console.error("Erro ao atualizar loja:", error);
    return res.status(500).json({ error: "Erro ao atualizar loja." });
  }
});

// Salvar o logotipo do perfil de uma loja
app.post("/lojas/:id/logo", async (req, res) => {
  let arquivoCriado: string | null = null;
  try {
    const idLoja = Number(req.params.id);
    const dataUrl = req.body?.dataUrl;
    if (!Number.isInteger(idLoja) || idLoja <= 0) {
      return res.status(400).json({ error: "ID da loja inválido." });
    }

    const imagem = typeof dataUrl === "string"
      ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl)
      : null;
    if (!imagem) {
      return res.status(400).json({ error: "Envie uma imagem JPG, PNG ou WEBP válida." });
    }

    const bytes = Buffer.from(imagem[2], "base64");
    if (!bytes.length || bytes.length > 3 * 1024 * 1024) {
      return res.status(413).json({ error: "O logotipo deve ter no máximo 3 MB após a compressão." });
    }

    const loja = await prisma.loja.findUnique({ where: { idLoja } });
    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada." });
    }

    const extensao = imagem[1].toLowerCase() === "jpeg" ? "jpg" : imagem[1].toLowerCase();
    await mkdir(lojaLogoDirectory, { recursive: true });
    const nomeArquivo = `${randomUUID()}.${extensao}`;
    arquivoCriado = path.join(lojaLogoDirectory, nomeArquivo);
    await writeFile(arquivoCriado, bytes, { flag: "wx" });

    const dsLogo = `/uploads/lojas/${nomeArquivo}`;
    await prisma.loja.update({ where: { idLoja }, data: { dsLogo } });

    if (loja.dsLogo?.startsWith("/uploads/lojas/")) {
      const logoAntiga = path.join(lojaLogoDirectory, path.basename(loja.dsLogo));
      await rm(logoAntiga, { force: true }).catch(() => {});
    }

    return res.json({ message: "Logotipo atualizado com sucesso!", dsLogo });
  } catch (error) {
    if (arquivoCriado) await rm(arquivoCriado, { force: true }).catch(() => {});
    console.error("Erro ao salvar logotipo da loja:", error);
    return res.status(500).json({ error: "Não foi possível salvar o logotipo da loja." });
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
        statusLojas: { where: { idLoja: id } },
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

// Atualizar o andamento de um pedido por uma loja participante
app.patch("/pedidos/:id/status", async (req, res) => {
  try {
    const idVenda = Number(req.params.id);
    const idLoja = Number(req.body?.idLoja);
    const tpStatusPedido = String(req.body?.tpStatusPedido ?? "").trim().toUpperCase();
    const dsMotivoNegado = String(req.body?.dsMotivoNegado ?? "").trim();
    const statusPermitidos = ["PENDENTE", "ENTREGUE", "RETIRADO", "NEGADO"];

    if (!Number.isInteger(idVenda) || idVenda <= 0 || !Number.isInteger(idLoja) || idLoja <= 0) {
      return res.status(400).json({ error: "Pedido ou loja inválidos." });
    }
    if (!statusPermitidos.includes(tpStatusPedido)) {
      return res.status(400).json({ error: "Escolha um status válido para o pedido." });
    }
    if (tpStatusPedido === "NEGADO" && !dsMotivoNegado) {
      return res.status(400).json({ error: "Informe o motivo para negar o pedido." });
    }
    if (dsMotivoNegado.length > 255) {
      return res.status(400).json({ error: "O motivo deve ter no máximo 255 caracteres." });
    }

    const venda = await prisma.venda.findUnique({
      where: { idVenda },
      include: { produtos: { include: { produto: { select: { idLoja: true } } } } },
    });

    if (!venda) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const pertenceALoja = venda.produtos.some(item => item.produto.idLoja === idLoja);
    if (!pertenceALoja) {
      return res.status(403).json({ error: "Este pedido não contém produtos da sua loja." });
    }

    const atualizado = await prisma.statusPedidoLoja.upsert({
      where: { idVenda_idLoja: { idVenda, idLoja } },
      update: {
        tpStatusPedido,
        dsMotivoNegado: tpStatusPedido === "NEGADO" ? dsMotivoNegado : null,
        dhAtualizacao: new Date(),
      },
      create: {
        idVenda,
        idLoja,
        tpStatusPedido,
        dsMotivoNegado: tpStatusPedido === "NEGADO" ? dsMotivoNegado : null,
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json({ message: "Status do pedido atualizado.", status: atualizado });
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return res.status(500).json({ error: "Não foi possível atualizar o status do pedido." });
  }
});

// Listar todos os produtos (catálogo)
app.get("/produtos", async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      include: { loja: { select: { idLoja: true, noLoja: true, hrAbertura: true, hrFechamento: true, diasFuncionamento: true, icAbreFeriados: true } } },
      orderBy: { noProduto: "asc" },
    });
    return res.json(produtos);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return res.status(500).json({ error: "Erro ao buscar produtos." });
  }
});

// Buscar um produto específico
app.get("/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID do produto inválido." });
    }

    const produto = await prisma.produto.findUnique({
      where: { cdProduto: id },
      include: { loja: { select: { idLoja: true, noLoja: true, hrAbertura: true, hrFechamento: true, diasFuncionamento: true, icAbreFeriados: true } } },
    });

    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    return res.json(produto);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    return res.status(500).json({ error: "Erro ao buscar produto." });
  }
});

// 1. Cadastrar Produto para uma Loja específica
app.post("/produtos", async (req, res) => {
  try {
    const { idLoja, noProduto, vlProdutoUnitario, qtProdutoEstoque } = req.body;

    const lojaId = Number(idLoja);
    const nome = typeof noProduto === "string" ? noProduto.trim() : "";
    const preco = Number(vlProdutoUnitario);
    const estoque = Number(qtProdutoEstoque);

    if (!Number.isInteger(lojaId) || lojaId <= 0) {
      return res.status(400).json({ error: "A loja vinculada ao produto é inválida. Faça login novamente." });
    }
    if (!nome || nome.length > 200) {
      return res.status(400).json({ error: "Informe um nome de produto com até 200 caracteres." });
    }
    if (!Number.isFinite(preco) || preco <= 0) {
      return res.status(400).json({ error: "Informe um preço válido maior que zero." });
    }
    if (!Number.isInteger(estoque) || estoque < 0) {
      return res.status(400).json({ error: "O estoque deve ser um número inteiro igual ou maior que zero." });
    }

    const loja = await prisma.loja.findUnique({ where: { idLoja: lojaId } });
    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada. Saia e entre novamente na conta da loja." });
    }

    const novoProduto = await prisma.produto.create({
      data: {
        idLoja: lojaId,
        noProduto: nome,
        vlProdutoUnitario: preco,
        qtProdutoEstoque: estoque,
      },
    });

    return res.status(201).json({ message: "Produto cadastrado com sucesso!", novoProduto });
  } catch (error) {
    console.error("Erro ao cadastrar produto:", error);
    return res.status(500).json({ error: "Não foi possível cadastrar o produto. Confira a conexão com o banco de dados." });
  }
});

// Salvar imagem principal de um produto (arquivo otimizado enviado pelo painel HTML)
app.post("/produtos/:id/imagem", async (req, res) => {
  let arquivoCriado: string | null = null;
  try {
    const idProduto = Number(req.params.id);
    const idLoja = Number(req.body?.idLoja);
    const dataUrl = req.body?.dataUrl;

    if (!Number.isInteger(idProduto) || idProduto <= 0 || !Number.isInteger(idLoja) || idLoja <= 0) {
      return res.status(400).json({ error: "Produto ou loja inválidos." });
    }

    const imagem = typeof dataUrl === "string"
      ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl)
      : null;
    if (!imagem) {
      return res.status(400).json({ error: "Envie uma imagem JPG, PNG ou WEBP válida." });
    }

    const extensao = imagem[1].toLowerCase() === "jpeg" ? "jpg" : imagem[1].toLowerCase();
    const bytes = Buffer.from(imagem[2], "base64");
    if (!bytes.length || bytes.length > 3 * 1024 * 1024) {
      return res.status(413).json({ error: "A imagem deve ter no máximo 3 MB após a compressão." });
    }

    const produto = await prisma.produto.findUnique({ where: { cdProduto: idProduto } });
    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }
    if (produto.idLoja !== idLoja) {
      return res.status(403).json({ error: "Este produto não pertence à loja conectada." });
    }

    await mkdir(uploadDirectory, { recursive: true });
    const nomeArquivo = `${randomUUID()}.${extensao}`;
    arquivoCriado = path.join(uploadDirectory, nomeArquivo);
    await writeFile(arquivoCriado, bytes, { flag: "wx" });

    const dsImagem = `/uploads/produtos/${nomeArquivo}`;
    await prisma.produto.update({
      where: { cdProduto: idProduto },
      data: { dsImagem },
    });

    if (produto.dsImagem?.startsWith("/uploads/produtos/")) {
      const imagemAntiga = path.join(uploadDirectory, path.basename(produto.dsImagem));
      await rm(imagemAntiga, { force: true }).catch(() => {});
    }

    return res.json({ message: "Imagem do produto salva com sucesso!", dsImagem });
  } catch (error) {
    if (arquivoCriado) await rm(arquivoCriado, { force: true }).catch(() => {});
    console.error("Erro ao salvar imagem do produto:", error);
    return res.status(500).json({ error: "Não foi possível salvar a imagem do produto." });
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
    if (qtProdutoEstoque !== undefined) {
      const estoque = Number(qtProdutoEstoque);
      if (!Number.isInteger(estoque) || estoque < 0) {
        return res.status(400).json({ error: "O estoque deve ser um número inteiro igual ou maior que zero." });
      }
      data.qtProdutoEstoque = estoque;
    }

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

// Atualizar dados pessoais e de contato do cliente
app.put("/clientes/:id/dados", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const cpf = String(req.body?.cpf ?? "").replace(/\D/g, "");
    const telefone = String(req.body?.telefone ?? "").replace(/\D/g, "");

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }
    if (!nome || nome.length > 155) {
      return res.status(400).json({ error: "Informe um nome com até 155 caracteres." });
    }
    if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Informe um e-mail válido com até 150 caracteres." });
    }
    if (cpf.length !== 11) {
      return res.status(400).json({ error: "O CPF deve conter 11 números." });
    }
    if (telefone && (telefone.length < 10 || telefone.length > 13)) {
      return res.status(400).json({ error: "Informe um telefone válido com DDD." });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { idCliente: id },
      include: { usuario: true },
    });
    if (!cliente) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }
    if (!cliente.usuario) {
      return res.status(400).json({ error: "Este cliente não possui uma conta de acesso vinculada." });
    }

    const usuarioComEmail = await prisma.usuario.findUnique({ where: { noEmail: email } });
    if (usuarioComEmail && usuarioComEmail.idUsuario !== cliente.usuario.idUsuario) {
      return res.status(409).json({ error: "Este e-mail já está sendo usado por outra conta." });
    }

    const clienteAtualizado = await prisma.$transaction(async tx => {
      await tx.cliente.update({
        where: { idCliente: id },
        data: { noCliente: nome, nrCpf: cpf },
      });
      await tx.usuario.update({
        where: { idUsuario: cliente.usuario!.idUsuario },
        data: { noEmail: email },
      });

      const telefoneExistente = await tx.telefoneCliente.findFirst({
        where: { idCliente: id },
        orderBy: { idTelefoneCliente: "asc" },
      });
      if (!telefone) {
        await tx.telefoneCliente.deleteMany({ where: { idCliente: id } });
      } else if (telefoneExistente) {
        await tx.telefoneCliente.update({
          where: { idTelefoneCliente: telefoneExistente.idTelefoneCliente },
          data: { nrTelefone: telefone },
        });
        await tx.telefoneCliente.deleteMany({
          where: { idCliente: id, idTelefoneCliente: { not: telefoneExistente.idTelefoneCliente } },
        });
      } else {
        await tx.telefoneCliente.create({ data: { idCliente: id, nrTelefone: telefone } });
      }

      return tx.cliente.findUnique({
        where: { idCliente: id },
        include: { telefones: true, usuario: { select: { noEmail: true } } },
      });
    });

    return res.json({ message: "Dados atualizados com sucesso!", cliente: clienteAtualizado });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Este e-mail já está sendo usado por outra conta." });
    }
    console.error("Erro ao atualizar dados do cliente:", error);
    return res.status(500).json({ error: "Não foi possível atualizar seus dados." });
  }
});

// Listar pedidos de um cliente
app.get("/clientes/:id/pedidos", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }

    const pedidos = await prisma.venda.findMany({
      where: { idCliente: id },
      orderBy: { idVenda: "desc" },
      include: {
        produtos: {
          include: { produto: { select: { noProduto: true } } },
        },
        statusLojas: { include: { loja: { select: { noLoja: true } } } },
      },
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json(pedidos);
  } catch (error) {
    console.error("Erro ao buscar pedidos do cliente:", error);
    return res.status(500).json({ error: "Erro ao buscar pedidos do cliente." });
  }
});

// Salvar/atualizar o endereço do cliente
app.put("/clientes/:id/endereco", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }

    const { noEndereco, nrNumero, nrCep, noCidade, sgUf } = req.body;

    if (!noEndereco || !noCidade || !sgUf) {
      return res.status(400).json({ error: "Informe endereço, cidade e UF." });
    }

    const cliente = await prisma.cliente.findUnique({ where: { idCliente: id } });
    if (!cliente) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    const existente = await prisma.enderecoCliente.findFirst({
      where: { idCliente: id },
    });

    const dados = {
      noEndereco,
      nrNumero: nrNumero || null,
      nrCep: nrCep || null,
      noCidade,
      sgUf: String(sgUf).toUpperCase().slice(0, 2),
    };

    const endereco = existente
      ? await prisma.enderecoCliente.update({
          where: { idEnderecoCliente: existente.idEnderecoCliente },
          data: dados,
        })
      : await prisma.enderecoCliente.create({
          data: { idCliente: id, ...dados },
        });

    return res.json({ message: "Endereço salvo com sucesso!", endereco });
  } catch (error) {
    console.error("Erro ao salvar endereço do cliente:", error);
    return res.status(500).json({ error: "Erro ao salvar endereço do cliente." });
  }
});

// Listar favoritos do cliente
app.get("/clientes/:id/favoritos", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID do cliente inválido." });
    }

    const favoritos = await prisma.favorito.findMany({
      where: { idCliente: id },
      include: {
        produto: {
          include: { loja: { select: { idLoja: true, noLoja: true } } },
        },
      },
      orderBy: { idFavorito: "desc" },
    });

    return res.json(favoritos);
  } catch (error) {
    console.error("Erro ao buscar favoritos:", error);
    return res.status(500).json({ error: "Erro ao buscar favoritos." });
  }
});

// Adicionar produto aos favoritos
app.post("/clientes/:id/favoritos", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cdProduto = Number(req.body.cdProduto);
    if (!Number.isInteger(id) || !Number.isInteger(cdProduto)) {
      return res.status(400).json({ error: "Cliente ou produto inválido." });
    }

    const favorito = await prisma.favorito.upsert({
      where: { idCliente_cdProduto: { idCliente: id, cdProduto } },
      update: {},
      create: { idCliente: id, cdProduto },
    });

    return res.status(201).json({ message: "Produto adicionado aos favoritos!", favorito });
  } catch (error) {
    console.error("Erro ao adicionar favorito:", error);
    return res.status(500).json({ error: "Erro ao adicionar favorito." });
  }
});

// Remover produto dos favoritos
app.delete("/clientes/:id/favoritos/:cdProduto", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const cdProduto = Number(req.params.cdProduto);
    if (!Number.isInteger(id) || !Number.isInteger(cdProduto)) {
      return res.status(400).json({ error: "Cliente ou produto inválido." });
    }

    await prisma.favorito.deleteMany({ where: { idCliente: id, cdProduto } });
    return res.json({ message: "Produto removido dos favoritos!" });
  } catch (error) {
    console.error("Erro ao remover favorito:", error);
    return res.status(500).json({ error: "Erro ao remover favorito." });
  }
});

// Rota de Cadastro (Cliente ou Construtora/Loja)
app.post("/register", async (req, res) => {
  try {
    console.log("Dados recebidos no cadastro:", req.body);

    const { nome, senha, tipoUsuario, cnpj, nomeLoja } = req.body;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    // Validação básica
    if (!email || !senha || !tipoUsuario) {
      return res.status(400).json({ error: "Preencha os campos obrigatórios." });
    }
    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Informe um e-mail válido com até 150 caracteres." });
    }

    // 1. Verifica se o e-mail já existe
    const usuarioExiste = await prisma.usuario.findFirst({
      where: { noEmail: { equals: email, mode: "insensitive" } },
    });

    if (usuarioExiste) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }

  
 // 2. Se for Dono de Loja/Construtora
    if (tipoUsuario === "DONO_LOJA") {
      const { 
        cnpj, nomeLoja, 
        noEndereco, noCidade, sgUf, 
        nrNumero, nrCep,
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
          enderecos: (noEndereco || noCidade || sgUf || nrNumero || nrCep) ? {
            create: {
              noEndereco: noEndereco || "",
              noCidade: noCidade || "",
              sgUf: sgUf || "",
              nrNumero: nrNumero || null,
              nrCep: nrCep || null,
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

      const { cpf, nrTelefone } = req.body;
      const cpfInformado = String(cpf ?? "").replace(/\D/g, "");

      if (cpfInformado && cpfInformado.length !== 11) {
        return res.status(400).json({ error: "O CPF deve conter 11 números." });
      }

      // Usa o CPF informado ou gera um temporário quando não enviado
      const nrCpf = cpfInformado || Math.floor(10000000000 + Math.random() * 90000000000).toString();

      const novoCliente = await prisma.cliente.create({
        data: {
          noCliente: nome,
          nrCpf,
          usuario: {
            create: {
              noEmail: email,
              dsSenha: senha,
              tpUsuario: "CLIENTE",
            },
          },
          telefones: nrTelefone ? { create: { nrTelefone } } : undefined,
        },
        include: { usuario: true, telefones: true },
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
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }
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
      nrNumeroEntrega,
      nrCepEntrega,
      noCidadeEntrega,
      sgUfEntrega,
    } = req.body;

    if (!Number.isInteger(Number(idCliente)) || Number(idCliente) <= 0 || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Cliente e itens do pedido são obrigatórios." });
    }

    const quantidades = new Map<number, number>();
    for (const item of itens) {
      const cdProduto = Number(item?.cdProduto);
      const quantidade = Number(item?.qtProdutoRetirado);
      if (!Number.isInteger(cdProduto) || cdProduto <= 0 || !Number.isInteger(quantidade) || quantidade <= 0) {
        return res.status(400).json({ error: "Há um produto ou quantidade inválida no pedido." });
      }
      quantidades.set(cdProduto, (quantidades.get(cdProduto) || 0) + quantidade);
    }

    const formaPagamento = String(tpPagamento ?? "").trim();
    if (!formaPagamento) {
      return res.status(400).json({ error: "Informe a forma de pagamento." });
    }
    const retirada = formaPagamento.toLowerCase().includes("retirada");
    if (!retirada && (!noEnderecoEntrega || !noCidadeEntrega || !sgUfEntrega)) {
      return res.status(400).json({ error: "Informe o endereço completo para pagamento na entrega." });
    }

    const clienteId = Number(idCliente);
    const endereco = retirada ? "Retirada na loja" : String(noEnderecoEntrega).trim();
    const numero = !retirada && nrNumeroEntrega ? String(nrNumeroEntrega).trim() : "";
    const cep = nrCepEntrega ? String(nrCepEntrega).replace(/\D/g, "") : "";
    const cidade = retirada ? "" : String(noCidadeEntrega).trim();
    const uf = retirada ? "" : String(sgUfEntrega).trim().toUpperCase().slice(0, 2);
    const enderecoCompleto = numero ? `${endereco}, ${numero}` : endereco;

    const resultado = await prisma.$transaction(async (tx) => {
      const idsProdutos = [...quantidades.keys()].sort((a, b) => a - b);
      const produtos = await tx.produto.findMany({ where: { cdProduto: { in: idsProdutos } } });
      const produtosPorId = new Map(produtos.map(produto => [produto.cdProduto, produto]));

      // A validação usa a loja vinculada aos produtos no banco, não os dados enviados pelo cliente.
      if (produtos.length === idsProdutos.length && new Set(produtos.map(produto => produto.idLoja)).size > 1) {
        throw new PedidoMultiplasLojasError("Cada compra pode conter produtos de apenas uma loja.");
      }

      for (const cdProduto of idsProdutos) {
        const produto = produtosPorId.get(cdProduto);
        const quantidade = quantidades.get(cdProduto)!;
        if (!produto) {
          throw new EstoqueIndisponivelError(`Um produto do carrinho não está mais disponível. Atualize a página e tente novamente.`);
        }
        if (produto.qtProdutoEstoque < quantidade) {
          throw new EstoqueIndisponivelError(
            `${produto.noProduto} está indisponível para essa quantidade. Estoque atual: ${produto.qtProdutoEstoque}.`
          );
        }

        // Atualização condicional impede que duas compras simultâneas vendam a mesma unidade.
        const atualizado = await tx.produto.updateMany({
          where: { cdProduto, qtProdutoEstoque: { gte: quantidade } },
          data: { qtProdutoEstoque: { decrement: quantidade } },
        });
        if (atualizado.count !== 1) {
          const estoqueAtual = await tx.produto.findUnique({
            where: { cdProduto },
            select: { noProduto: true, qtProdutoEstoque: true },
          });
          throw new EstoqueIndisponivelError(
            `${estoqueAtual?.noProduto || produto.noProduto} acabou ou não tem unidades suficientes. Estoque atual: ${estoqueAtual?.qtProdutoEstoque ?? 0}.`
          );
        }
      }

      const itensPedido = idsProdutos.map(cdProduto => {
        const produto = produtosPorId.get(cdProduto)!;
        const quantidade = quantidades.get(cdProduto)!;
        return {
          cdProduto,
          qtProdutoRetirado: quantidade,
          vlTotalProduto: produto.vlProdutoUnitario * quantidade,
        };
      });
      const total = itensPedido.reduce((soma, item) => soma + item.vlTotalProduto, 0);
      const produtosDoPedido = await tx.produto.findMany({
        where: { cdProduto: { in: idsProdutos } },
        select: { cdProduto: true, noProduto: true, idLoja: true, qtProdutoEstoque: true },
      });
      const estoqueEsgotado = produtosDoPedido
        .filter(produto => produto.qtProdutoEstoque === 0)
        .map(({ cdProduto, noProduto, idLoja }) => ({ cdProduto, noProduto, idLoja }));

      const novaVenda = await tx.venda.create({
        data: {
          idCliente: clienteId,
          vlTotalVenda: total,
          icPago: 0,
          tpPagamento: formaPagamento,
          noEnderecoEntrega: enderecoCompleto || null,
          noCidadeEntrega: cidade || null,
          sgUfEntrega: uf || null,
          produtos: {
            create: itensPedido.map(item => ({
              cdProduto: item.cdProduto,
              qtProdutoRetirado: item.qtProdutoRetirado,
              vlTotalProduto: item.vlTotalProduto,
            })),
          },
        },
        include: { produtos: true },
      });

      const lojasDoPedido = [...new Set(produtosDoPedido.map(produto => produto.idLoja))];
      if (lojasDoPedido.length) {
        await tx.statusPedidoLoja.createMany({
          data: lojasDoPedido.map(idLoja => ({ idVenda: novaVenda.idVenda, idLoja })),
        });
      }

      if (!retirada) {
        const enderecoExistente = await tx.enderecoCliente.findFirst({
          where: { idCliente: clienteId },
        });

        if (enderecoExistente) {
          await tx.enderecoCliente.update({
            where: { idEnderecoCliente: enderecoExistente.idEnderecoCliente },
            data: {
              noEndereco: endereco,
              nrNumero: numero || null,
              nrCep: cep || null,
              noCidade: cidade,
              sgUf: uf,
            },
          });
        } else {
          await tx.enderecoCliente.create({
            data: {
              idCliente: clienteId,
              noEndereco: endereco,
              nrNumero: numero || null,
              nrCep: cep || null,
              noCidade: cidade,
              sgUf: uf,
            },
          });
        }
      }

      return { venda: novaVenda, estoqueEsgotado };
    });

    return res.status(201).json({ message: "Pedido realizado com sucesso!", ...resultado });
  } catch (error: any) {
    if (error instanceof PedidoMultiplasLojasError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof EstoqueIndisponivelError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Erro ao criar pedido:", error);
    return res.status(500).json({ error: error.message || "Erro ao criar pedido." });
  }
});

// Buscar um pedido específico (com itens, cliente e lojas)
app.get("/pedidos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID do pedido inválido." });
    }

    const pedido = await prisma.venda.findUnique({
      where: { idVenda: id },
      include: {
        cliente: {
          include: {
            usuario: { select: { noEmail: true } },
            telefones: true,
          },
        },
        produtos: {
          include: {
            produto: {
              include: { loja: { select: { idLoja: true, noLoja: true } } },
            },
          },
        },
      },
    });

    if (!pedido) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    return res.json(pedido);
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    return res.status(500).json({ error: "Erro ao buscar pedido." });
  }
});

// Cliente realiza o pagamento do pedido (simulado)
app.post("/pedidos/:id/pagar", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const idCliente = Number(req.body.idCliente);

    if (!Number.isInteger(id) || !Number.isInteger(idCliente)) {
      return res.status(400).json({ error: "Dados do pagamento inválidos." });
    }

    const venda = await prisma.venda.findUnique({ where: { idVenda: id } });
    if (!venda) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }
    if (venda.idCliente !== idCliente) {
      return res.status(403).json({ error: "Este pedido não pertence a você." });
    }
    if (venda.icPago) {
      return res.json({ message: "Este pedido já está pago.", venda });
    }

    const atualizada = await prisma.venda.update({
      where: { idVenda: id },
      data: { icPago: 1, dhPagamento: new Date() },
      include: { produtos: { include: { produto: { select: { noProduto: true } } } } },
    });

    return res.json({ message: "Pagamento realizado com sucesso!", venda: atualizada });
  } catch (error) {
    console.error("Erro ao pagar pedido:", error);
    return res.status(500).json({ error: "Erro ao processar o pagamento." });
  }
});

// Loja confirma o recebimento do pagamento
app.post("/pedidos/:id/confirmar", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const idLoja = Number(req.body.idLoja);

    if (!Number.isInteger(id) || !Number.isInteger(idLoja)) {
      return res.status(400).json({ error: "Dados da confirmação inválidos." });
    }

    const venda = await prisma.venda.findUnique({
      where: { idVenda: id },
      include: { produtos: { include: { produto: { select: { idLoja: true } } } } },
    });

    if (!venda) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const pertenceALoja = venda.produtos.some(item => item.produto.idLoja === idLoja);
    if (!pertenceALoja) {
      return res.status(403).json({ error: "Este pedido não pertence à sua loja." });
    }
    if (venda.icPago) {
      return res.json({ message: "O pagamento deste pedido já foi confirmado.", venda });
    }

    const atualizada = await prisma.venda.update({
      where: { idVenda: id },
      data: { icPago: 1, dhPagamento: new Date() },
    });

    return res.json({ message: "Pagamento confirmado com sucesso!", venda: atualizada });
  } catch (error) {
    console.error("Erro ao confirmar pagamento:", error);
    return res.status(500).json({ error: "Erro ao confirmar o pagamento." });
  }
});

// Rota de Login Geral (Cliente, Construtora ou Admin)
app.post("/auth/solicitar-redefinicao", async (req, res) => {
  const mensagem = "Se os dados corresponderem a uma conta, enviaremos as instruções para o e-mail cadastrado.";
  try {
    if (!resetTokenSecret) {
      return res.status(503).json({ error: "A redefinição de senha não está configurada no servidor." });
    }

    const baseConfigurada = process.env.APP_BASE_URL?.trim();
    const origem = req.get("origin");
    let baseReferer = "";
    if (process.env.NODE_ENV !== "production" && req.get("referer")) {
      try {
        const refererUrl = new URL(req.get("referer")!);
        if (!origem || refererUrl.origin === new URL(origem).origin) {
          baseReferer = new URL(".", refererUrl).toString();
        }
      } catch {
        // Se o Referer não for válido, usa a origem configurada abaixo.
      }
    }
    const baseApp = process.env.NODE_ENV === "production"
      ? baseConfigurada || ""
      : baseReferer || baseConfigurada || origem || "http://localhost:5500";
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    const emailFrom = process.env.EMAIL_FROM?.trim();
    if (!baseApp || (process.env.NODE_ENV === "production" && (!resendApiKey || !emailFrom))) {
      return res.status(503).json({ error: "A redefinição de senha não está configurada no servidor." });
    }

    let appUrl: URL;
    try {
      appUrl = new URL(baseApp);
      if (!['http:', 'https:'].includes(appUrl.protocol)) throw new Error("Protocolo inválido.");
    } catch {
      return res.status(503).json({ error: "O endereço do site não está configurado corretamente." });
    }

    const identificador = typeof req.body?.identificador === "string" ? req.body.identificador.trim() : "";
    if (!identificador) return res.status(400).json({ error: "Informe seu e-mail, CPF ou CNPJ." });

    let usuario;
    if (identificador.includes("@")) {
      usuario = await prisma.usuario.findFirst({
        where: { noEmail: { equals: identificador.toLowerCase(), mode: "insensitive" } },
        select: { idUsuario: true, noEmail: true, dsSenha: true, tpUsuario: true },
      });
    } else {
      const numeros = identificador.replace(/\D/g, "");
      if (numeros.length === 11) {
        usuario = await prisma.usuario.findFirst({
          where: { cliente: { is: { nrCpf: numeros } } },
          select: { idUsuario: true, noEmail: true, dsSenha: true, tpUsuario: true },
        });
      } else if (numeros.length === 14) {
        const cnpjFormatado = numeros.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
        usuario = await prisma.usuario.findFirst({
          where: { loja: { is: { nrCnpj: { in: [numeros, cnpjFormatado] } } } },
          select: { idUsuario: true, noEmail: true, dsSenha: true, tpUsuario: true },
        });
      }
    }

    if (!usuario || usuario.tpUsuario === "ADMIN") return res.json({ message: mensagem });

    const token = criarTokenRedefinicao(usuario.idUsuario, usuario.dsSenha);
    const caminhoFrontend = appUrl.pathname.replace(/\/+$/, "");
    const link = new URL(`${caminhoFrontend}/redefinir-senha.html`, appUrl.origin).toString() + `?token=${encodeURIComponent(token)}`;
    if (resendApiKey && emailFrom) {
      const respostaEmail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [usuario.noEmail],
          subject: "Redefinição de senha · DiskObra",
          text: `Recebemos uma solicitação para redefinir sua senha. Acesse este link em até 30 minutos: ${link}\n\nSe você não solicitou a redefinição, ignore esta mensagem.`,
          html: `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${link.replace(/&/g, "&amp;")}">Criar uma nova senha</a></p><p>Este link expira em 30 minutos. Se você não solicitou a redefinição, ignore esta mensagem.</p>`,
        }),
      });
      if (!respostaEmail.ok) {
        console.error("Falha ao enviar e-mail de redefinição. Status do provedor:", respostaEmail.status);
        return res.status(502).json({ error: "Não foi possível enviar o e-mail agora. Tente novamente mais tarde." });
      }
      return res.json({ message: mensagem });
    }

    // Em desenvolvimento, permite testar o fluxo sem um provedor de e-mail.
    return res.json({ message: mensagem, resetUrl: link });
  } catch (error) {
    console.error("Erro ao solicitar redefinição de senha:", error);
    return res.status(500).json({ error: "Não foi possível processar a solicitação." });
  }
});

app.post("/auth/redefinir-senha", async (req, res) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const novaSenha = typeof req.body?.novaSenha === "string" ? req.body.novaSenha : "";
    if (novaSenha.length < 8 || novaSenha.length > 255) {
      return res.status(400).json({ error: "A nova senha deve ter entre 8 e 255 caracteres." });
    }

    const dadosToken = lerTokenRedefinicao(token);
    if (!dadosToken) return res.status(400).json({ error: "Este link é inválido ou expirou. Solicite uma nova redefinição." });

    const usuario = await prisma.usuario.findUnique({
      where: { idUsuario: dadosToken.idUsuario },
      select: { idUsuario: true, dsSenha: true, tpUsuario: true },
    });
    if (!usuario || usuario.tpUsuario === "ADMIN" || !timingSafeEqual(hashSenha(usuario.dsSenha), Buffer.from(dadosToken.versaoSenha, "hex"))) {
      return res.status(400).json({ error: "Este link é inválido ou expirou. Solicite uma nova redefinição." });
    }
    if (novaSenha === usuario.dsSenha) {
      return res.status(400).json({ error: "Escolha uma senha diferente da atual." });
    }

    const atualizacao = await prisma.usuario.updateMany({
      where: { idUsuario: usuario.idUsuario, dsSenha: usuario.dsSenha },
      data: { dsSenha: novaSenha },
    });
    if (atualizacao.count !== 1) {
      return res.status(400).json({ error: "Este link já foi utilizado. Solicite uma nova redefinição." });
    }
    return res.json({ message: "Senha redefinida com sucesso. Você já pode entrar com a nova senha." });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return res.status(500).json({ error: "Não foi possível redefinir a senha." });
  }
});

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

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, "0.0.0.0", () => {
  console.log(` Backend rodando na porta ${PORT}`);
});
