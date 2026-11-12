# DiskObra

Marketplace de materiais de construção que conecta clientes e lojas. O repositório contém uma API Express, um site HTML/CSS/JavaScript e um aplicativo Expo.

> **Estado do projeto:** protótipo em desenvolvimento. Pagamentos ainda não são processados por um gateway e a autenticação precisa de melhorias antes de uso em produção.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `backend/` | API Express, Prisma ORM 7, PostgreSQL e migrações |
| `frontend/` | Site estático HTML/CSS/JavaScript para clientes e donos de loja |
| `mobile/` | Aplicativo Expo/React Native com Expo Router |
| `src/` | Exemplo inicial Vite/React; não é o site HTML de `frontend/` |

## Funcionalidades

### Site HTML (`frontend/`)

- Catálogo, busca, detalhes dos produtos, depósitos, carrinho, conta, pedidos e favoritos.
- Cadastro/login de clientes e donos de loja.
- Painel da loja com perfil, cadastro/edição/exclusão de produtos, estoque e pedidos recebidos.
- Upload de uma imagem principal por produto (JPG, PNG ou WEBP); a imagem é reduzida no navegador e guardada em `backend/uploads/produtos/`.
- No checkout, o cliente escolhe **pagar na entrega** ou **pagar na retirada**. O site prepara uma mensagem por loja no WhatsApp; o cliente precisa abrir o link e tocar em **Enviar**.

### Aplicativo (`mobile/`)

- Catálogo, login/cadastro, carrinho e telas de cliente e dono de loja.
- URL da API configurável por `EXPO_PUBLIC_API_URL`; em desenvolvimento, o app tenta usar o host do servidor Expo.

### API e banco de dados

- API REST em `http://localhost:3000`.
- PostgreSQL acessado pelo Prisma 7 com adapter `@prisma/adapter-pg`.
- Migrações versionadas em `backend/prisma/migrations/`.
- Produtos, imagens, lojas, clientes, endereços, pedidos, itens de pedido e favoritos.

Rotas principais: `GET /lojas`, `GET/PUT /lojas/:id`, `GET /lojas/:id/pedidos`, `GET /produtos`, `GET /produtos/:id`, `POST/PUT/DELETE /produtos`, `POST /produtos/:id/imagem`, `POST /register`, `POST /login`, `POST /pedidos`, `GET /clientes/:id/pedidos` e rotas de endereço/favoritos.

## Requisitos

- Node.js **22.13 ou superior** (recomendado para o Expo SDK 58).
- PostgreSQL instalado e em execução.
- Para o site estático: Python ou a extensão Live Server do VS Code (opcional).

## Instalação do banco e da API

Execute os comandos Prisma a partir de `backend/`.

1. Clone o repositório e entre na pasta da API:

   ```bash
   git clone <URL-DO-REPOSITORIO> DiskObra
   cd DiskObra/backend
   npm ci
   ```

2. Crie um banco PostgreSQL vazio chamado `diskobra` usando pgAdmin ou `createdb diskobra`.

3. Crie o arquivo local de variáveis de ambiente:

   **PowerShell:**
   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux:**
   ```bash
   cp .env.example .env
   ```

   Edite `backend/.env` e ajuste usuário, senha, host e porta do PostgreSQL:

   ```env
   DATABASE_URL="postgresql://postgres:senha@localhost:5432/diskobra?schema=public"
   PORT=3000
   ```

   Se a senha tiver caracteres especiais, codifique-os na URL (por exemplo, `@` como `%40`). O `.env` não deve ser enviado ao GitHub.

4. Aplique as migrações incluídas no repositório e gere o Prisma Client:

   ```bash
   npm run db:validate
   npm run db:deploy
   npm run db:generate
   ```

5. Inicie a API:

   ```bash
   npm run dev
   ```

   A API ficará disponível em `http://localhost:3000` e registra método, rota e status das requisições no terminal.

### Comandos úteis do backend

| Comando | Uso |
|---|---|
| `npm run db:deploy` | Aplica migrações existentes sem criar um banco shadow; recomendado para configurar um clone |
| `npm run db:migrate -- --name nome_da_migracao` | Cria/aplica uma migração durante o desenvolvimento |
| `npm run db:generate` | Gera o Prisma Client após alterações no schema |
| `npm run db:status` | Mostra migrações pendentes/aplicadas |
| `npm run db:validate` | Valida o schema Prisma |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run db:seed` | Insere dados de demonstração; execute **uma única vez** em banco vazio |

`db:deploy` não cria o banco PostgreSQL: ele precisa existir antes. Para inicializar um clone, prefira `db:deploy`; `db:migrate` é destinado a criar novas migrações durante o desenvolvimento e pode precisar de permissão para criar um banco shadow. Evite `prisma migrate reset`, pois esse comando apaga os dados do banco.

### Erros comuns do Prisma ao clonar

- **`DATABASE_URL` ausente:** copie `backend/.env.example` para `backend/.env` e ajuste a URL. A configuração do Prisma aponta explicitamente para esse arquivo.
- **Banco não existe ou conexão recusada:** inicie o PostgreSQL e crie o banco `diskobra` antes de rodar `npm run db:deploy`.
- **Senha/autenticação falhou:** confira usuário, senha, porta e codificação de caracteres especiais na URL.
- **Migração pendente:** dentro de `backend/`, rode `npm run db:status` e depois `npm run db:deploy`.
- **Comando executado na pasta errada:** use `cd backend` antes dos comandos `npm run db:*`. O arquivo de configuração principal é `backend/prisma.config.js`.

## Executar o site HTML

Com a API em execução, abra outro terminal na raiz do repositório:

```bash
python -m http.server 5500 --directory frontend
```

Abra `http://localhost:5500/produtos.html`. Também é possível abrir `login.html` ou `cadastro-deposito.html` diretamente. Como alternativa, use a extensão **Live Server** do VS Code.

O site usa o hostname da página para localizar a API na porta `3000`. Se a API estiver em outro computador, configure `window.DISKOBRA_API_URL` antes de carregar `app.js` (por exemplo, `http://192.168.1.20:3000`). Em dispositivos na rede local, libere a porta 3000 no firewall.

## Executar o aplicativo Expo

```bash
cd mobile
npm ci
npx expo start
```

Para definir manualmente o endereço da API, crie `mobile/.env` com:

```env
EXPO_PUBLIC_API_URL=http://IP-DO-COMPUTADOR:3000
```

Em celular físico, computador e celular devem estar na mesma rede. O `.env` do app também é local e não deve ser enviado ao GitHub.

## Pagamentos e imagens

- O checkout registra a preferência de pagar na entrega ou na retirada; não há cobrança automática. O pagamento deve ser confirmado manualmente pela loja após verificar o recebimento.
- O WhatsApp abre com a mensagem do pedido preenchida, mas o cliente precisa confirmar o envio.
- Imagens são armazenadas localmente em `backend/uploads/produtos/` e não são versionadas. Em produção, use armazenamento persistente ou um serviço de objetos; arquivos locais podem se perder se o servidor for recriado.

## Segurança e limitações conhecidas

- O protótipo ainda armazena senhas sem hash e não usa sessões/JWT. Não exponha a API publicamente sem implementar autenticação e autorização adequadas.
- Existe um acesso administrativo de demonstração definido no código (`admin@diskobra.com` / `admin123`); remova ou substitua antes de qualquer publicação real.
- As rotas de pagamento são simuladas; não confirmam transações bancárias.
- O banco e a API devem ficar acessíveis pela rede usada pelo navegador/aplicativo.
