# DiskObra

Marketplace de materiais de construção que conecta **clientes**, **lojas/construtoras** e um **administrador**. O projeto está organizado em três partes:

| Pasta | Descrição | Stack |
|-------|-----------|-------|
| `backend/` | API REST e acesso ao banco | Express 5, Prisma 7 (adapter `pg`), PostgreSQL, TypeScript (`tsx`) |
| `mobile/` | Aplicativo (iOS/Android/Web) | Expo SDK 58, Expo Router, React Native 0.88, TypeScript |
| `src/` | App web em Vite (placeholder) | React 19 + Vite |

---

## O que já está pronto

### Backend (`backend/`)

- Servidor Express com `cors` e `express.json`.
- Conexão com PostgreSQL via **Prisma 7** usando o driver adapter `@prisma/adapter-pg` (`pg.Pool`).
- Modelagem completa do domínio em `prisma/schema.prisma`.
- Migrações versionadas (`prisma/migrations/`):
  - `20261106134700_init` — criação das tabelas base.
  - `20261108171855_add_usuarios_roles` — tabela de usuários e enum de papéis.
- Script de seed (`seed.ts`) com dados de exemplo: loja, produtos, cliente e uma venda.
- Rotas da API:
  - `GET /lojas` — lista lojas com produtos, endereços e telefones.
  - `POST /produtos` — cadastra produto em uma loja.
  - `POST /enderecos` — cadastra endereço de uma loja.
  - `POST /register` — cadastro de cliente ou de loja/construtora (com endereço e telefone).
  - `POST /login` — login por e-mail/senha, retornando o `tipoUsuario` e o `lojaId` quando aplicável.
- Login de administrador de demonstração (credenciais fixas no código).

### Banco de dados

Modelos implementados (nomes físicos em `TB_*`):

- `Usuario` (`TB_USUARIO`) — e-mail, senha, papel (`CLIENTE`, `ADMIN`, `DONO_LOJA`) e vínculo opcional com cliente/loja.
- `Loja` (`TB_LOJA`) — CNPJ, dono, produtos, telefones e endereços.
- `Produto` (`TB_PRODUTO`) — estoque e valor unitário por loja.
- `Cliente` (`TB_CLIENTE`) — nome, RG, CPF, telefones, endereços e vendas.
- `Venda` (`TB_VENDA`) / `ProdutoVenda` (`TB_PRODUTO_VENDA`) — vendas e itens.
- `TelefoneLoja`, `EnderecosLoja`, `TelefoneCliente`, `EnderecoCliente` — contatos e endereços.

### Mobile (`mobile/`)

- Navegação por rotas com **Expo Router** (`src/app/`).
- **Catálogo** (`index.tsx`): lista lojas vindas da API, busca por nome, chips de categorias e botão de login.
- **Login** (`login.tsx`): seleção Cliente/Construtora, autenticação na API e redirecionamento do dono de loja para o painel.
- **Cadastro** (`register.tsx`): formulário dinâmico para cliente ou construtora (dados da empresa e endereço).
- **Painel da Construtora** (`loja/dashboard.tsx`): cadastro de endereço da loja e de produtos/materiais.
- **Painel do Administrador** (`admin/dashboard.tsx`): visão geral com total de lojas e lista de lojas ativas.
- **Painel do Cliente** (`cliente/dashboard.tsx`): tela inicial (esqueleto).

### Web (`src/`)

- App Vite mínimo com React 19 (apenas página inicial de exemplo — ainda não implementado).

---

## Como rodar

### Pré-requisitos

- Node.js 20+
- PostgreSQL acessível

### Backend

```bash
cd backend
npm install
```

Crie um arquivo `backend/.env` com a string de conexão:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/diskobra?schema=public"
PORT=3000
```

Depois:

```bash
npm run db:migrate     # aplica as migrações
npm run db:generate    # gera o Prisma Client
npm run db:seed        # popula dados de exemplo
npm run dev            # inicia a API (http://localhost:3000)
```

> Comandos Prisma também disponíveis: `db:studio`.

### Mobile

```bash
cd mobile
npm install
npx expo start
```

> A URL da API está fixa em `http://192.168.15.8:3000` nos arquivos de tela. Ajuste o IP para o da sua máquina/emulador antes de rodar.

---

## Limitações e próximos passos

- [ ] Centralizar a URL da API em uma variável de configuração (hoje está fixa em cada tela).
- [ ] Login redireciona apenas `DONO_LOJA`; faltam os fluxos de redirecionamento para `CLIENTE` e `ADMIN`.
- [ ] Alinhar contratos das rotas com o app:
  - `POST /produtos` espera `vlProdutoUnitario` e `qtProdutoEstoque`, mas o app envia `vlPreco` e `qtEstoque`.
  - `POST /enderecos` espera `noEndereco`, `noCidade`, `sgUf`, mas o app envia `noRua`, `nrNumero`, `noBairro`, `sgEstado`, `nrCep`.
- [ ] Hash de senha (hoje armazenada em texto puro) e autenticação por token (JWT).
- [ ] Implementar área do cliente (pedidos, carrinho, checkout) e cadastro real de CPF.
- [ ] Integrar o app web (`src/`) com a API.
- [ ] Criar CRUD completo de produtos, lojas e vendas no backend.
