const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => 'R$' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const dep = document.body.dataset.area === 'deposito';
const parsePrice = value => {
    const text = String(value ?? '').trim().replace(/\s/g, '');
    const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
    return Number(normalized);
};

const API_URL = window.DISKOBRA_API_URL || `http://${location.hostname || 'localhost'}:3000`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const lerResposta = async res => {
    try {
        return await res.json();
    } catch {
        return {};
    }
};

const getSessao = () => {
    try {
        return JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
    } catch {
        return null;
    }
};

const getJson = async (url, opts) => {
    let res;
    try {
        res = await fetch(url, opts);
    } catch {
        throw new Error(`Não foi possível acessar a API em ${API_URL}. Confira se o backend está ativo e acessível nesta rede.`);
    }
    const data = await lerResposta(res);
    if (!res.ok) throw new Error(data.error || 'Erro ao conectar com o servidor.');
    return data;
};

const imagemUrl = caminho => {
    if (!caminho) return '';
    return /^https?:\/\//i.test(caminho)
        ? caminho
        : `${API_URL}${String(caminho).startsWith('/') ? '' : '/'}${caminho}`;
};

/* carrinho (localStorage) */
const CART_KEY = 'cart';
const getCart = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(raw)
            ? raw.filter(i => i && Number.isInteger(Number(i.cdProduto)) && Number(i.cdProduto) > 0)
            : [];
    } catch {
        return [];
    }
};
const setCart = cart => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const addToCart = (produto, qtd = 1) => {
    const cart = getCart();
    const item = cart.find(i => Number(i.cdProduto) === Number(produto.cdProduto));
    if (item) {
        item.qtProdutoRetirado += qtd;
        item.dsImagem = produto.dsImagem || item.dsImagem || null;
    } else {
        cart.push({
            cdProduto: Number(produto.cdProduto),
            noProduto: produto.noProduto,
            vlProdutoUnitario: Number(produto.vlProdutoUnitario),
            qtProdutoRetirado: qtd,
            idLoja: produto.idLoja,
            noLoja: produto.loja?.noLoja || '',
            dsImagem: produto.dsImagem || null
        });
    }
    setCart(cart);
};

const produtosCache = new Map();
let produtoDetalhe = null;

const productEmoji = p => {
    const n = (p?.noProduto || '').toLowerCase();
    if (n.includes('cimento')) return '🧱';
    if (n.includes('tijolo')) return '🧱';
    if (n.includes('furadeira')) return '🪛';
    if (n.includes('parafusadeira')) return '🪛';
    if (n.includes('tinta')) return '🎨';
    if (n.includes('areia')) return '⛱️';
    if (n.includes('telha')) return '🏠';
    if (n.includes('ferro') || n.includes('aço')) return '🔩';
    if (n.includes('cano') || n.includes('tubo')) return '🔧';
    return '🛠️';
};

const imagemProdutoHtml = (produto, className = 'product-image') => produto?.dsImagem
    ? `<img class="${className}" src="${escapeHtml(imagemUrl(produto.dsImagem))}" alt="${escapeHtml(produto.noProduto || 'Imagem do produto')}" loading="lazy">`
    : productEmoji(produto);

const ligarCep = (input, preencher) => {
    if (!input) return;
    let ultimo = '';
    const buscar = async () => {
        const digits = input.value.replace(/\D/g, '');
        if (digits.length !== 8 || digits === ultimo) return;
        ultimo = digits;
        try {
            const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            const dados = await res.json();
            if (dados.erro) {
                ultimo = '';
                return;
            }
            preencher(dados);
        } catch (err) {
            console.error('Erro ao buscar CEP:', err);
            ultimo = '';
        }
    };
    input.addEventListener('input', () => {
        let v = input.value.replace(/\D/g, '').slice(0, 8);
        if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
        input.value = v;
        if (v.replace(/\D/g, '').length === 8) buscar();
    });
    input.addEventListener('blur', buscar);
};

/* header */
const nav2Label = document.body.dataset.nav2 || 'MEU CARRINHO';
const nav2Href = document.body.dataset.nav2Url || (document.body.dataset.nav2 ? 'conta.html#pedidos' : 'carrinho.html');
const nav = dep ? [['MINHA LOJA', 'deposito-perfil.html'], ['ESTOQUE', 'deposito-estoque.html'], ['PEDIDOS', 'deposito-pedidos.html']]
    : [['PRODUTOS', 'produtos.html'], [nav2Label, nav2Href], ['DEPÓSITOS', 'depositos.html']];
$('#hd').outerHTML = `<header class="hd"><a class="logo" href="produtos.html">DISK<b></b>BRA</a>
<nav>${nav.map(n => `<a href="${n[1]}">${n[0]}</a>`).join('')}</nav>
<form class="search" onsubmit="event.preventDefault();location.href='produtos.html?q='+encodeURIComponent(this.q.value)"><input name="q" placeholder="Busque o que procura aqui...." aria-label="Buscar"><button aria-label="Buscar">🔍</button></form>
<a class="user" href="${dep ? 'deposito-perfil.html' : 'conta.html'}" aria-label="Minha conta">👤</a>${dep ? '<a class="logout" href="login.html" data-logout>Sair</a>' : ''}</header>`;

/* sidebar depósito */
const sb = $('#sidebar');
if (sb) sb.innerHTML = [['+ Cadastrar produto', 'deposito-cadastrar-produto.html'], ['🛒 Pedidos', 'deposito-pedidos.html'], ['📦 Estoque', 'deposito-estoque.html'], ['👤 Perfil', 'deposito-perfil.html']]
    .map(l => `<a href="${l[1]}" class="${location.pathname.endsWith(l[1]) ? 'on' : ''}">${l[0]}</a>`).join('')
    + '<a class="out" href="login.html" data-logout>Sair</a>';

/* produtos */
const stars = n => '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
const g = $('#grid');
if (g) {
    const params = new URLSearchParams(location.search);
    const q = (params.get('q') || '').toLowerCase();
    const lojaId = Number(params.get('loja')) || null;
    const sessao = getSessao();
    const favoritos = new Set();

    const render = produtos => {
        const lista = produtos.filter(p =>
            (!lojaId || Number(p.idLoja) === lojaId) &&
            (p.noProduto || '').toLowerCase().includes(q)
        );

        const info = $('#filterInfo');
        if (info) {
            if (lojaId) {
                const nome = produtos.find(p => Number(p.idLoja) === lojaId)?.loja?.noLoja || 'depósito selecionado';
                info.innerHTML = `Mostrando produtos de <b>${nome}</b> · <a href="produtos.html">ver todos os produtos</a>`;
            } else {
                info.textContent = '';
            }
        }

        g.innerHTML = lista.length ? lista.map(p => {
            produtosCache.set(Number(p.cdProduto), p);
            const fav = favoritos.has(Number(p.cdProduto));
            return `<article class="pc">
                <a class="img" href="produto.html?id=${p.cdProduto}">${imagemProdutoHtml(p)}</a>
                <div class="pc-top"><h3>${p.noProduto}</h3><button class="fav ${fav ? 'on' : ''}" data-fav="${p.cdProduto}" aria-label="Favoritar">${fav ? '♥' : '♡'}</button></div>
                <small class="loja">${p.loja?.noLoja || ''}</small>
                <div class="stars">${stars(4)}</div>
                <div class="pr">${fmt(Number(p.vlProdutoUnitario))}</div>
                <button class="btn-or" data-add="${p.cdProduto}">Adicionar ao carrinho</button>
            </article>`;
        }).join('') : '<p>Nenhum produto encontrado. Tente outro termo.</p>';
    };

    (async () => {
        if (sessao?.clienteId) {
            try {
                const favs = await getJson(`${API_URL}/clientes/${sessao.clienteId}/favoritos`);
                favs.forEach(f => favoritos.add(Number(f.cdProduto)));
            } catch (err) {
                console.error('Erro ao carregar favoritos:', err);
            }
        }
        try {
            render(await getJson(`${API_URL}/produtos`));
        } catch (err) {
            console.error(err);
            g.innerHTML = '<p>Não foi possível carregar os produtos. Verifique se o servidor está rodando.</p>';
        }
    })();
}

/* página de detalhe do produto */
if ($('.det') && !g) {
    const id = Number(new URLSearchParams(location.search).get('id'));
    if (!Number.isInteger(id) || id <= 0) {
        $('.det').innerHTML = '<p>Produto não encontrado.</p>';
    } else {
        (async () => {
            try {
                const p = await getJson(`${API_URL}/produtos/${id}`);
                produtoDetalhe = p;
                produtosCache.set(Number(p.cdProduto), p);
                $('#detImg').innerHTML = imagemProdutoHtml(p, 'detail-product-image');
                $('#detTitle').textContent = p.noProduto;
                $('#detPrice').textContent = fmt(Number(p.vlProdutoUnitario));
                $('#detInfo').innerHTML = `<b>Loja:</b> ${p.loja?.noLoja || 'Não informada'}<br><b>Estoque:</b> ${p.qtProdutoEstoque} unidade(s)`;
                const add = $('.det [data-add]');
                if (add) add.dataset.add = p.cdProduto;
                document.title = p.noProduto + ' · DiskObra';

                const favBtn = $('#detFav');
                if (favBtn) {
                    favBtn.dataset.fav = p.cdProduto;
                    const sessao = getSessao();
                    if (sessao?.clienteId) {
                        try {
                            const favs = await getJson(`${API_URL}/clientes/${sessao.clienteId}/favoritos`);
                            if (favs.some(f => Number(f.cdProduto) === Number(p.cdProduto))) {
                                favBtn.classList.add('on');
                                favBtn.textContent = '♥';
                            }
                        } catch (err) {
                            console.error('Erro ao carregar favorito:', err);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                $('.det').innerHTML = '<p>Não foi possível carregar este produto.</p>';
            }
        })();
    }
}

document.addEventListener('click', async e => {
    const add = e.target.closest('[data-add]');
    if (add) {
        let id = Number(add.dataset.add);
        if (!id && produtoDetalhe) id = Number(produtoDetalhe.cdProduto);
        const produto = produtosCache.get(id) || (produtoDetalhe && Number(produtoDetalhe.cdProduto) === id ? produtoDetalhe : null);
        if (produto) {
            addToCart(produto);
            add.textContent = 'Adicionado ✓';
            setTimeout(() => { add.textContent = 'Adicionar ao carrinho'; }, 1200);
        }
    }

    const fav = e.target.closest('[data-fav]');
    if (fav) {
        e.preventDefault();
        const sessao = getSessao();
        if (!sessao?.clienteId) {
            alert('Entre na sua conta para favoritar produtos.');
            location.href = 'login.html';
            return;
        }
        const id = Number(fav.dataset.fav);
        const ativo = fav.classList.toggle('on');
        fav.textContent = ativo ? '♥' : '♡';
        try {
            if (ativo) {
                await fetch(`${API_URL}/clientes/${sessao.clienteId}/favoritos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cdProduto: id })
                });
            } else {
                await fetch(`${API_URL}/clientes/${sessao.clienteId}/favoritos/${id}`, { method: 'DELETE' });
            }
        } catch (err) {
            console.error('Erro ao atualizar favorito:', err);
        }
    }

    const unfav = e.target.closest('[data-unfav]');
    if (unfav) {
        e.preventDefault();
        const sessao = getSessao();
        if (!sessao?.clienteId) return;
        const id = Number(unfav.dataset.unfav);
        try {
            await fetch(`${API_URL}/clientes/${sessao.clienteId}/favoritos/${id}`, { method: 'DELETE' });
            const card = unfav.closest('.pc');
            if (card) card.remove();
            const box = $('#accFavoritos');
            if (box && !box.querySelector('.pc')) box.innerHTML = '<p>Você ainda não tem produtos favoritos.</p>';
        } catch (err) {
            console.error('Erro ao remover favorito:', err);
        }
    }

    const o = e.target.closest('.ord .top');
    if (o) o.parentElement.classList.toggle('open');
});

/* carrinho */
const ct = $('#cart');
if (ct) {
    let frete = null;
    const sessao = getSessao();

    const draw = () => {
        const cart = getCart();
        ct.innerHTML = cart.length ? cart.map((c, i) => `<tr>
            <td><span class="th">${imagemProdutoHtml(c, 'cart-product-image')}</span>${c.noProduto}</td>
            <td>${fmt(Number(c.vlProdutoUnitario))}</td>
            <td><div class="qty"><button data-m="${i}" aria-label="Diminuir">−</button><span>${c.qtProdutoRetirado}</span><button data-p="${i}" aria-label="Aumentar">+</button></div></td>
            <td><b>${fmt(Number(c.vlProdutoUnitario) * c.qtProdutoRetirado)}</b></td>
            <td><button class="del" data-d="${i}" aria-label="Remover">🗑</button></td>
        </tr>`).join('') : '<tr><td colspan="5">Seu carrinho está vazio. Escolha produtos para começar.</td></tr>';

        const sub = cart.reduce((s, c) => s + Number(c.vlProdutoUnitario) * c.qtProdutoRetirado, 0);
        const retirada = $('#pagamento')?.value === 'retirada';
        $('#secaoEntrega').hidden = retirada;
        $('#retiradaInfo').hidden = !retirada;
        $('#sub').textContent = fmt(sub);
        $('#fr').textContent = retirada ? 'Sem frete (retirada)' : frete == null ? 'A definir' : fmt(frete);
        $('#tot').textContent = fmt(sub + (retirada ? 0 : frete || 0));
    };

    $('#pagamento')?.addEventListener('change', draw);

    ct.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        const cart = getCart();
        const i = Number(b.dataset.m ?? b.dataset.p ?? b.dataset.d);
        if (Number.isNaN(i) || !cart[i]) return;
        if (b.dataset.m !== undefined && cart[i].qtProdutoRetirado > 1) cart[i].qtProdutoRetirado--;
        if (b.dataset.p !== undefined) cart[i].qtProdutoRetirado++;
        if (b.dataset.d !== undefined) cart.splice(i, 1);
        setCart(cart);
        draw();
    });

    $('#calc').onclick = () => {
        if ($('#pagamento').value === 'retirada') return;
        const v = $('#cep').value.replace(/\D/g, '');
        if (v.length !== 8) {
            $('#cep').focus();
            return alert('Digite um CEP com 8 números.');
        }
        frete = 49.9;
        draw();
    };

    ligarCep($('#cep'), dados => {
        $('#endEndereco').value = dados.logradouro || '';
        $('#endCidade').value = dados.localidade || '';
        $('#endUf').value = dados.uf || '';
        $('#endNumero').focus();
    });

    if (sessao?.clienteId) {
        getJson(`${API_URL}/clientes/${sessao.clienteId}`)
            .then(cliente => {
                const end = cliente.enderecos?.[0];
                if (!end) return;
                $('#cep').value = end.nrCep || '';
                $('#endEndereco').value = end.noEndereco || '';
                $('#endNumero').value = end.nrNumero || '';
                $('#endCidade').value = end.noCidade || '';
                $('#endUf').value = end.sgUf || '';
            })
            .catch(() => { });
    }

    $('#buy').onclick = async () => {
        const cart = getCart();
        if (!cart.length) return alert('Adicione produtos ao carrinho.');
        if (!sessao?.clienteId) {
            alert('Faça login como cliente para finalizar a compra.');
            location.href = 'login.html';
            return;
        }

        const retirada = $('#pagamento').value === 'retirada';
        const tpPagamento = retirada ? 'Pagar na retirada' : 'Pagar na entrega';
        const noEndereco = $('#endEndereco').value.trim();
        const nrNumero = $('#endNumero').value.trim();
        const nrCep = $('#cep').value.replace(/\D/g, '');
        const noCidade = $('#endCidade').value.trim();
        const sgUf = $('#endUf').value.trim().toUpperCase();

        if (!retirada && (!noEndereco || !noCidade || sgUf.length !== 2)) {
            return alert('Preencha o endereço de entrega (endereço, cidade e UF).');
        }

        $('#buy').disabled = true;
        $('#buy').textContent = 'Enviando...';
        const feedback = $('#checkoutFeedback');
        feedback.textContent = '';
        feedback.className = 'checkout-feedback';

        try {
            const idsLojas = [...new Set(cart.map(item => Number(item.idLoja)).filter(Number.isInteger))];
            const lojas = await getJson(`${API_URL}/lojas`);
            const lojasSelecionadas = idsLojas.map(id => lojas.find(loja => Number(loja.idLoja) === id));
            if (lojasSelecionadas.some(loja => !loja)) {
                throw new Error('Não foi possível localizar uma das lojas do carrinho. Atualize a página e tente novamente.');
            }
            const destinatarios = lojasSelecionadas.map(loja => {
                const telefone = String(loja.telefones?.[0]?.nrTelefone || '').replace(/\D/g, '');
                const whatsapp = telefone.startsWith('55') && [12, 13].includes(telefone.length)
                    ? telefone
                    : [10, 11].includes(telefone.length) ? `55${telefone}` : null;
                return { loja, whatsapp };
            });
            if (destinatarios.some(destinatario => !destinatario.whatsapp)) {
                const lojaSemTelefone = destinatarios.find(destinatario => !destinatario.whatsapp)?.loja;
                throw new Error(`A loja ${lojaSemTelefone?.noLoja || ''} precisa cadastrar um telefone/WhatsApp válido antes de receber pedidos.`);
            }

            const resultado = await getJson(`${API_URL}/pedidos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idCliente: sessao.clienteId,
                    itens: cart.map(c => ({
                        cdProduto: Number(c.cdProduto),
                        qtProdutoRetirado: c.qtProdutoRetirado,
                        vlTotalProduto: Number(c.vlProdutoUnitario) * c.qtProdutoRetirado
                    })),
                    tpPagamento,
                    noEnderecoEntrega: retirada ? '' : noEndereco,
                    nrNumeroEntrega: retirada ? '' : nrNumero,
                    nrCepEntrega: retirada ? '' : nrCep,
                    noCidadeEntrega: retirada ? '' : noCidade,
                    sgUfEntrega: retirada ? '' : sgUf
                })
            });

            const idPedido = resultado.venda?.idVenda;
            if (!idPedido) throw new Error('O pedido foi criado, mas não recebemos o número do pedido.');

            const linksWhatsApp = destinatarios.map(({ loja, whatsapp }) => {
                const itensLoja = cart.filter(item => Number(item.idLoja) === Number(loja.idLoja));
                const subtotalLoja = itensLoja.reduce((soma, item) => soma + Number(item.vlProdutoUnitario) * Number(item.qtProdutoRetirado), 0);
                const listaItens = itensLoja.map(item => `- ${item.qtProdutoRetirado}x ${item.noProduto}: ${fmt(Number(item.vlProdutoUnitario) * Number(item.qtProdutoRetirado))}`).join('\n');
                const mensagem = [
                    `Olá, ${loja.noLoja}! Fiz um pedido pelo DiskObra.`,
                    `Pedido #${idPedido}`,
                    `Cliente: ${sessao.nome || sessao.email}`,
                    `Pagamento: ${tpPagamento}`,
                    retirada ? 'Retirada na loja.' : `Entrega: ${noEndereco}, ${nrNumero} - ${noCidade}/${sgUf}.`,
                    '',
                    'Itens desta loja:',
                    listaItens,
                    `Subtotal: ${fmt(subtotalLoja)}`,
                    '',
                    'Por favor, confirme a disponibilidade e combine comigo a forma de pagamento e o horário/prazo.'
                ].join('\n');
                return `<a class="btn-or" href="https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}" target="_blank" rel="noopener noreferrer">Enviar pedido para ${escapeHtml(loja.noLoja)} no WhatsApp</a>`;
            }).join('');

            setCart([]);
            draw();
            feedback.innerHTML = `<div class="checkout-success"><b>Pedido #${Number(idPedido)} criado.</b><p>${tpPagamento}. O pagamento só será confirmado depois que a loja conferir o recebimento.</p><p>Abra o WhatsApp de cada loja e toque em Enviar:</p><div class="checkout-links">${linksWhatsApp}</div><a href="conta.html#pedidos">Ver meus pedidos</a></div>`;
            feedback.classList.add('success');
            $('#buy').textContent = 'Pedido realizado';
            feedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
            feedback.textContent = err.message || 'Não foi possível finalizar o pedido.';
            feedback.classList.add('error');
            $('#buy').disabled = false;
            $('#buy').textContent = 'Finalizar compra';
        }
    };

    draw();
}

/* depósitos cadastrados */
const depList = $('#depList');
if (depList) {
    (async () => {
        try {
            const lojas = await getJson(`${API_URL}/lojas`);
            if (!lojas.length) {
                depList.innerHTML = '<p>Nenhum depósito cadastrado ainda.</p>';
                return;
            }
            depList.innerHTML = lojas.map(l => {
                const end = l.enderecos?.[0];
                const endereco = end
                    ? `${[end.noEndereco, end.nrNumero].filter(Boolean).join(', ')} - ${end.noCidade} - ${end.sgUf}${end.nrCep ? ' · CEP ' + end.nrCep : ''}`
                    : 'Endereço não informado';
                const tel = l.telefones?.[0]?.nrTelefone || 'Telefone não informado';
                const qtd = l.produtos?.length || 0;
                return `<article class="dep-card">
                    <div class="dep-head">
                        <div class="dep-av">🏬</div>
                        <div><h3>${l.noLoja}</h3><small>CNPJ: ${l.nrCnpj || 'não informado'}</small></div>
                    </div>
                    <p class="dep-line">📍 ${endereco}</p>
                    <p class="dep-line">📞 ${tel}</p>
                    <div class="dep-foot">
                        <span class="tag t-ok">${qtd} produto(s)</span>
                        <a class="btn-or" href="produtos.html?loja=${l.idLoja}">Ver produtos</a>
                    </div>
                </article>`;
            }).join('');
        } catch (err) {
            console.error('Erro ao carregar depósitos:', err);
            depList.innerHTML = '<p>Não foi possível carregar os depósitos.</p>';
        }
    })();
}

/* formulários de autenticação conectados ao Backend */

$$('form[data-auth], #formLogin, #formCadastro').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const m = $('.msg', f);
    if (m) m.textContent = '';
    $$('.fld', f).forEach(x => x.classList.remove('err'));

    const bad = $$('input[required]', f).find(i => !i.value.trim());
    if (bad) {
        bad.parentElement.classList.add('err');
        bad.focus();
        if (m) m.textContent = 'Preencha todos os campos.';
        return;
    }

    const data = Object.fromEntries(new FormData(f).entries());
    const isLogin = f.id === 'formLogin' || location.pathname.includes('login');
    const isDeposito = f.id === 'formDeposito' || location.pathname.includes('cadastro-deposito');

    try {
        if (isLogin) {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email, senha: data.senha })
            });

            const result = await lerResposta(res);
            if (!res.ok) throw new Error(result.error || 'E-mail ou senha inválidos');

            localStorage.setItem('usuarioLogado', JSON.stringify(result));

            if (result.tipoUsuario === 'DONO_LOJA') {
                location.href = 'deposito-perfil.html';
            } else if (result.tipoUsuario === 'ADMIN') {
                location.href = 'admin-dashboard.html';
            } else {
                location.href = 'produtos.html';
            }
        } else {
            if (data.senha !== data.senhaConfirma) {
                throw new Error('As senhas não conferem.');
            }

            const payload = isDeposito
                ? {
                    tipoUsuario: 'DONO_LOJA',
                    nomeLoja: data.nomeLoja,
                    cnpj: data.cnpj,
                    email: data.email,
                    senha: data.senha,
                    nrTelefone: data.nrTelefone || '',
                    noEndereco: data.noEndereco || '',
                    noCidade: data.noCidade || '',
                    sgUf: (data.sgUf || '').toUpperCase()
                }
                : {
                    tipoUsuario: 'CLIENTE',
                    nome: data.nome,
                    email: data.email,
                    senha: data.senha,
                    cpf: (data.cpf || '').replace(/\D/g, ''),
                    nrTelefone: data.nrTelefone || ''
                };

            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await lerResposta(res);
            if (!res.ok) throw new Error(result.error || 'Erro ao cadastrar');

            alert(isDeposito
                ? 'Depósito cadastrado com sucesso! Faça login para continuar.'
                : 'Cadastro realizado com sucesso! Faça login para continuar.');
            location.href = 'login.html';
        }
    } catch (err) {
        console.error('Erro no login/cadastro:', err);
        if (m) m.textContent = err.message;
        else alert(err.message);
    }
}));

/* cadastro de produto da loja */
const comprimirImagem = arquivo => new Promise((resolve, reject) => {
    if (!arquivo || !/^image\/(jpeg|png|webp)$/i.test(arquivo.type)) {
        reject(new Error('Escolha uma imagem JPG, PNG ou WEBP.'));
        return;
    }
    if (arquivo.size > 12 * 1024 * 1024) {
        reject(new Error('A imagem original deve ter no máximo 12 MB.'));
        return;
    }

    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
        URL.revokeObjectURL(url);
        const maxLado = 1280;
        const escala = Math.min(1, maxLado / Math.max(imagem.naturalWidth, imagem.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
        canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
        const contexto = canvas.getContext('2d');
        if (!contexto) {
            reject(new Error('Não foi possível preparar a imagem neste navegador.'));
            return;
        }
        contexto.fillStyle = '#fff';
        contexto.fillRect(0, 0, canvas.width, canvas.height);
        contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Não foi possível comprimir a imagem.'));
                return;
            }
            const leitor = new FileReader();
            leitor.onload = () => resolve(leitor.result);
            leitor.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
            leitor.readAsDataURL(blob);
        }, 'image/jpeg', 0.82);
    };
    imagem.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('O arquivo escolhido não é uma imagem válida.'));
    };
    imagem.src = url;
});

const formProduto = $('#formProduto');
if (formProduto) {
    const sessao = getSessao();
    const mensagem = $('#produtoMensagem');
    const botao = $('#salvarProduto');
    const campoImagem = $('#produtoImagem');
    const preview = $('#produtoImagemPreview');
    const previewImg = $('#produtoImagemPreviewImg');
    let produtoIdAtual = Number(new URLSearchParams(location.search).get('id')) || null;
    let produtoExistente = null;
    let previewObjectUrl = null;
    const mostrarMensagem = (texto, tipo = 'error') => {
        mensagem.textContent = texto;
        mensagem.className = `msg ${tipo}`;
    };

    const mostrarPreview = (src, alt = 'Pré-visualização do produto') => {
        if (previewObjectUrl && previewObjectUrl !== src) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = src.startsWith('blob:') ? src : null;
        previewImg.src = src;
        previewImg.alt = alt;
        preview.hidden = false;
    };

    const esconderPreview = () => {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
        previewImg.removeAttribute('src');
        preview.hidden = true;
    };

    if (sessao?.tipoUsuario !== 'DONO_LOJA' || !Number.isInteger(Number(sessao?.lojaId)) || Number(sessao?.lojaId) <= 0) {
        mostrarMensagem('Entre como dono da loja para cadastrar ou editar produtos.');
    } else if (produtoIdAtual) {
        botao.disabled = true;
        botao.textContent = 'Carregando produto...';
        getJson(`${API_URL}/produtos/${produtoIdAtual}`).then(produto => {
            if (Number(produto.idLoja) !== Number(sessao.lojaId)) {
                throw new Error('Este produto não pertence à sua loja.');
            }
            produtoExistente = produto;
            $('#produtoPageTitle').textContent = 'EDITAR PRODUTO';
            document.title = `Editar ${produto.noProduto} · DiskObra`;
            $('#produtoNome').value = produto.noProduto || '';
            $('#produtoPreco').value = String(produto.vlProdutoUnitario ?? '').replace('.', ',');
            $('#produtoEstoque').value = String(produto.qtProdutoEstoque ?? 0);
            botao.textContent = 'Salvar alterações';
            if (produto.dsImagem) mostrarPreview(imagemUrl(produto.dsImagem), `Imagem atual de ${produto.noProduto}`);
        }).catch(error => {
            console.error('Erro ao carregar produto para edição:', error);
            mostrarMensagem(`${error.message} (API ${API_URL})`);
            botao.textContent = 'Salvar alterações';
        }).finally(() => {
            botao.disabled = false;
        });
    }

    campoImagem.addEventListener('change', () => {
        const arquivo = campoImagem.files?.[0];
        if (!arquivo) {
            if (!produtoExistente?.dsImagem) esconderPreview();
            return;
        }
        if (!/^image\/(jpeg|png|webp)$/i.test(arquivo.type)) {
            campoImagem.value = '';
            mostrarMensagem('Escolha uma imagem JPG, PNG ou WEBP.');
            return;
        }
        mostrarPreview(URL.createObjectURL(arquivo), `Pré-visualização de ${arquivo.name}`);
        mensagem.textContent = '';
    });

    formProduto.addEventListener('submit', async e => {
        e.preventDefault();
        const lojaId = Number(sessao?.lojaId);
        if (sessao?.tipoUsuario !== 'DONO_LOJA' || !Number.isInteger(lojaId) || lojaId <= 0) {
            mostrarMensagem('Sua sessão não está vinculada a uma loja. Saia e entre novamente como dono da loja.');
            return;
        }

        const noProduto = $('#produtoNome').value.trim();
        const vlProdutoUnitario = parsePrice($('#produtoPreco').value);
        const qtProdutoEstoque = Number($('#produtoEstoque').value);
        if (!noProduto || noProduto.length > 200) {
            mostrarMensagem('Informe o nome do produto (máximo de 200 caracteres).');
            $('#produtoNome').focus();
            return;
        }
        if (!Number.isFinite(vlProdutoUnitario) || vlProdutoUnitario <= 0) {
            mostrarMensagem('Informe um preço válido maior que zero.');
            $('#produtoPreco').focus();
            return;
        }
        if (!Number.isInteger(qtProdutoEstoque) || qtProdutoEstoque < 0) {
            mostrarMensagem('Informe uma quantidade inteira igual ou maior que zero.');
            $('#produtoEstoque').focus();
            return;
        }

        botao.disabled = true;
        botao.textContent = 'Salvando...';
        mensagem.textContent = '';
        try {
            const arquivoImagem = campoImagem.files?.[0] || null;
            const dataUrlImagem = arquivoImagem ? await comprimirImagem(arquivoImagem) : null;
            const editando = Boolean(produtoIdAtual);
            const resultado = await getJson(editando ? `${API_URL}/produtos/${produtoIdAtual}` : `${API_URL}/produtos`, {
                method: editando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editando
                    ? { noProduto, vlProdutoUnitario, qtProdutoEstoque }
                    : { idLoja: lojaId, noProduto, vlProdutoUnitario, qtProdutoEstoque })
            });

            const produtoSalvo = editando ? resultado.produto : resultado.novoProduto;
            const idProduto = Number(produtoSalvo?.cdProduto || produtoIdAtual);
            if (!idProduto) throw new Error('O produto foi salvo, mas não recebemos o identificador para a imagem.');
            if (!editando) {
                produtoIdAtual = idProduto;
                produtoExistente = produtoSalvo;
                history.replaceState(null, '', `${location.pathname}?id=${idProduto}`);
                $('#produtoPageTitle').textContent = 'EDITAR PRODUTO';
                document.title = `Editar ${noProduto} · DiskObra`;
            }

            if (dataUrlImagem) {
                try {
                    const upload = await getJson(`${API_URL}/produtos/${idProduto}/imagem`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idLoja: lojaId, dataUrl: dataUrlImagem })
                    });
                    produtoExistente = { ...(produtoExistente || {}), ...produtoSalvo, dsImagem: upload.dsImagem };
                    mostrarPreview(imagemUrl(upload.dsImagem), `Imagem de ${noProduto}`);
                    campoImagem.value = '';
                } catch (errorImagem) {
                    mostrarMensagem(`Os dados foram salvos, mas a imagem não foi enviada: ${errorImagem.message}`, 'error');
                    return;
                }
            }

            if (editando) {
                produtoExistente = { ...(produtoExistente || {}), ...produtoSalvo };
                botao.textContent = 'Salvar alterações';
                mostrarMensagem('Produto atualizado com sucesso.', 'success');
            } else {
                formProduto.reset();
                esconderPreview();
                produtoIdAtual = null;
                produtoExistente = null;
                history.replaceState(null, '', location.pathname);
                $('#produtoPageTitle').textContent = 'CADASTRAR NOVO PRODUTO';
                document.title = 'Cadastrar produto · DiskObra';
                mostrarMensagem('Produto cadastrado e adicionado ao estoque.', 'success');
            }
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            mostrarMensagem(`${error.message} (loja ${lojaId}; API ${API_URL})`);
        } finally {
            botao.disabled = false;
            botao.textContent = produtoIdAtual ? 'Salvar alterações' : 'Cadastrar produto';
        }
    });
}

/* estoque do dono da loja */
const estoqueLista = $('#estoqueLista');
if (estoqueLista) {
    const sessao = getSessao();
    const mensagem = $('#estoqueMensagem');
    const lojaId = Number(sessao?.lojaId);
    const produtos = new Map();
    const mostrarMensagem = (texto, tipo = '') => {
        mensagem.textContent = texto;
        mensagem.className = `store-message ${tipo}`.trim();
    };

    const carregarEstoque = async () => {
        if (sessao?.tipoUsuario !== 'DONO_LOJA' || !Number.isInteger(lojaId) || lojaId <= 0) {
            mostrarMensagem('Esta conta não está vinculada a uma loja. Saia e entre novamente como dono da loja.', 'error');
            return;
        }
        mostrarMensagem('Carregando estoque...');
        estoqueLista.innerHTML = '';
        try {
            const loja = await getJson(`${API_URL}/lojas/${lojaId}`);
            const lista = Array.isArray(loja.produtos) ? loja.produtos : [];
            produtos.clear();
            lista.forEach(produto => produtos.set(Number(produto.cdProduto), produto));
            if (!lista.length) {
                mostrarMensagem('Nenhum produto cadastrado. Use “Cadastrar produto” para adicionar o primeiro.');
                return;
            }
            mostrarMensagem(`${lista.length} produto(s) no estoque.`, 'success');
            estoqueLista.innerHTML = lista.map(produto => `
                <article class="inventory-item">
                    <div class="inventory-thumb">${imagemProdutoHtml(produto, 'inventory-product-image')}</div>
                    <div class="inventory-main">
                        <h3>${escapeHtml(produto.noProduto)}</h3>
                        <p>${fmt(Number(produto.vlProdutoUnitario))} · Estoque: <b>${Number(produto.qtProdutoEstoque)}</b></p>
                    </div>
                    <div class="inventory-actions">
                        <a class="btn-or" href="deposito-cadastrar-produto.html?id=${Number(produto.cdProduto)}">Editar</a>
                        <button type="button" class="inventory-delete" data-excluir-produto="${Number(produto.cdProduto)}">Excluir</button>
                    </div>
                </article>`).join('');
        } catch (error) {
            console.error('Erro ao carregar estoque:', error);
            mostrarMensagem(`${error.message} (loja ${lojaId || 'não vinculada'}; API ${API_URL})`, 'error');
        }
    };

    estoqueLista.addEventListener('click', async e => {
        const excluir = e.target.closest('[data-excluir-produto]');
        if (!excluir) return;
        const produtoId = Number(excluir.dataset.excluirProduto);
        const produto = produtos.get(produtoId);
        if (!produto) return;

        if (confirm(`Excluir “${produto.noProduto}” do estoque?`)) {
            try {
                await getJson(`${API_URL}/produtos/${produtoId}`, { method: 'DELETE' });
                await carregarEstoque();
                mostrarMensagem('Produto removido do estoque.', 'success');
            } catch (error) {
                console.error('Erro ao excluir produto:', error);
                mostrarMensagem(`${error.message} (API ${API_URL})`, 'error');
            }
        }
    });

    carregarEstoque();
}

/* pedidos recebidos pela loja */
const pedidosLista = $('#pedidosLista');
if (pedidosLista) {
    const sessao = getSessao();
    const mensagem = $('#pedidosMensagem');
    const lojaId = Number(sessao?.lojaId);
    const mostrarMensagem = (texto, tipo = '') => {
        mensagem.textContent = texto;
        mensagem.className = `store-message ${tipo}`.trim();
    };

    const carregarPedidos = async () => {
        if (sessao?.tipoUsuario !== 'DONO_LOJA' || !Number.isInteger(lojaId) || lojaId <= 0) {
            mostrarMensagem('Esta conta não está vinculada a uma loja. Saia e entre novamente como dono da loja.', 'error');
            return;
        }
        mostrarMensagem('Carregando pedidos...');
        pedidosLista.innerHTML = '';
        try {
            const pedidos = await getJson(`${API_URL}/lojas/${lojaId}/pedidos`);
            if (!Array.isArray(pedidos) || !pedidos.length) {
                mostrarMensagem('Nenhum pedido recebido ainda.');
                return;
            }
            mostrarMensagem(`${pedidos.length} pedido(s) recebido(s).`, 'success');
            pedidosLista.innerHTML = pedidos.map(pedido => {
                const itens = (pedido.produtos || []).map(item => `
                    <div class="it">
                        <span>${Number(item.qtProdutoRetirado)}x ${escapeHtml(item.produto?.noProduto || 'Produto')}</span>
                        <span>${fmt(Number(item.vlTotalProduto))}</span>
                    </div>`).join('');
                const subtotal = (pedido.produtos || []).reduce((soma, item) => soma + Number(item.vlTotalProduto || 0), 0);
                const endereco = [pedido.noEnderecoEntrega, pedido.noCidadeEntrega, pedido.sgUfEntrega].filter(Boolean).join(' · ');
                const data = pedido.dhVenda ? new Date(pedido.dhVenda).toLocaleString('pt-BR') : 'Data não informada';
                const cliente = pedido.cliente?.noCliente || 'Cliente';
                const telefone = pedido.cliente?.telefones?.[0]?.nrTelefone || '';
                const status = pedido.icPago ? '<span class="tag t-ok">Pago</span>' : '<span class="tag t-tr">Aguardando pagamento</span>';
                return `<article class="ord order-card">
                    <div class="top">
                        <span><b>Pedido #${Number(pedido.idVenda)}</b><br><small>${escapeHtml(data)}</small></span>
                        ${status}
                        <strong>${fmt(subtotal)}</strong>
                        <span aria-hidden="true">⌄</span>
                    </div>
                    ${itens}
                    <div class="more">
                        <b>Cliente:</b> ${escapeHtml(cliente)}${telefone ? ` · ${escapeHtml(telefone)}` : ''}<br>
                        <b>Entrega:</b> ${escapeHtml(endereco || 'A combinar')}<br>
                        <b>Pagamento:</b> ${escapeHtml(pedido.tpPagamento || 'A combinar')}
                    </div>
                </article>`;
            }).join('');
        } catch (error) {
            console.error('Erro ao carregar pedidos da loja:', error);
            mostrarMensagem(`${error.message} (loja ${lojaId || 'não vinculada'}; API ${API_URL})`, 'error');
        }
    };

    $('#atualizarPedidos')?.addEventListener('click', carregarPedidos);
    carregarPedidos();
}


/* conta do cliente */
const accNome = $('#accNome');
if (accNome) {
    const sessao = getSessao();

    if (!sessao || !sessao.clienteId) {
        location.href = 'login.html';
    } else {
        const iniciais = (sessao.nome || 'Cliente').trim().split(/\s+/)
            .map(p => p[0]).slice(0, 2).join('').toUpperCase();
        $('#accAvatar').textContent = iniciais;
        $('#accNome').textContent = sessao.nome || 'Cliente';
        $('#accEmail').textContent = '@ ' + (sessao.email || '');

        const secoes = ['dados', 'pedidos', 'enderecos', 'favoritos'];
        const mostrarSecao = nome => {
            $$('[data-sec]').forEach(s => { s.hidden = s.dataset.sec !== nome; });
            $$('.side a[data-target]').forEach(a => a.classList.toggle('on', a.dataset.target === nome));
        };
        const alvo = (location.hash || '#dados').replace('#', '');
        mostrarSecao(secoes.includes(alvo) ? alvo : 'dados');
        $$('.side a[data-target]').forEach(a => a.addEventListener('click', e => {
            e.preventDefault();
            mostrarSecao(a.dataset.target);
            history.replaceState(null, '', '#' + a.dataset.target);
        }));
        window.addEventListener('hashchange', () => {
            const h = (location.hash || '#dados').replace('#', '');
            if (secoes.includes(h)) mostrarSecao(h);
        });

        const renderEnderecos = enderecos => {
            $('#accEnderecos').innerHTML = enderecos.length
                ? enderecos.map(e => {
                    const linha = [e.noEndereco, e.nrNumero].filter(Boolean).join(', ');
                    const cep = e.nrCep ? ` · CEP ${e.nrCep}` : '';
                    return `<div class="addr">${linha} - ${e.noCidade} - ${e.sgUf}${cep}</div>`;
                }).join('')
                : '<p>Nenhum endereço cadastrado ainda.</p>';
        };

        const preencherEndereco = enderecos => {
            const e = enderecos?.[0];
            if (!e) return;
            $('#accCep').value = e.nrCep || '';
            $('#accEndereco').value = e.noEndereco || '';
            $('#accNumero').value = e.nrNumero || '';
            $('#accCidade').value = e.noCidade || '';
            $('#accUf').value = e.sgUf || '';
        };

        ligarCep($('#accCep'), dados => {
            $('#accEndereco').value = dados.logradouro || '';
            $('#accCidade').value = dados.localidade || '';
            $('#accUf').value = dados.uf || '';
            $('#accNumero').focus();
        });

        const renderPedidos = lista => {
            $('#accPedidos').innerHTML = lista.length
                ? lista.map(p => {
                    const data = new Date(p.dhVenda).toLocaleDateString('pt-BR');
                    const status = p.icPago
                        ? '<span class="tag t-ok">✔ Pago</span>'
                        : '<span class="tag t-tr">❗ Pendente</span>';
                    const itens = (p.produtos || []).map(i =>
                        `<div class="it"><span>🪛 ${i.produto?.noProduto || 'Produto'} x ${i.qtProdutoRetirado}</span><span>${fmt(i.vlTotalProduto)}</span></div>`
                    ).join('');
                    return `<div class="ord"><div class="top"><span>Pedido #${p.idVenda} - <small>${data}</small></span>${status}<span>${fmt(p.vlTotalVenda)}</span><span>⌄</span></div>${itens}<div class="more">${p.tpPagamento ? 'Pagamento: ' + p.tpPagamento : 'Forma de pagamento não informada'}${p.noEnderecoEntrega ? ' · Entrega: ' + p.noEnderecoEntrega : ''}</div></div>`;
                }).join('')
                : '<p>Você ainda não fez nenhum pedido.</p>';
        };

        const renderFavoritos = favoritos => {
            const box = $('#accFavoritos');
            if (!favoritos.length) {
                box.innerHTML = '<p>Você ainda não tem produtos favoritos.</p>';
                return;
            }
            box.innerHTML = favoritos.map(f => {
                const p = f.produto;
                produtosCache.set(Number(p.cdProduto), p);
                return `<article class="pc">
                    <a class="img" href="produto.html?id=${p.cdProduto}">${imagemProdutoHtml(p)}</a>
                    <div class="pc-top"><h3>${p.noProduto}</h3><button class="fav on" data-unfav="${p.cdProduto}" aria-label="Remover dos favoritos">♥</button></div>
                    <small class="loja">${p.loja?.noLoja || ''}</small>
                    <div class="pr">${fmt(Number(p.vlProdutoUnitario))}</div>
                    <button class="btn-or" data-add="${p.cdProduto}">Adicionar ao carrinho</button>
                </article>`;
            }).join('');
        };

        const carregarConta = async () => {
            try {
                const [cliente, pedidos, favoritos] = await Promise.all([
                    getJson(`${API_URL}/clientes/${sessao.clienteId}`).catch(() => null),
                    getJson(`${API_URL}/clientes/${sessao.clienteId}/pedidos`).catch(() => []),
                    getJson(`${API_URL}/clientes/${sessao.clienteId}/favoritos`).catch(() => [])
                ]);

                if (cliente) {
                    $('#accNome').textContent = cliente.noCliente || sessao.nome || 'Cliente';
                    $('#accEmail').textContent = '@ ' + (cliente.usuario?.noEmail || sessao.email || '');
                    const tel = cliente.telefones?.[0]?.nrTelefone;
                    $('#accTelefone').textContent = tel ? '📞 ' + tel : '';
                    renderEnderecos(cliente.enderecos || []);
                    preencherEndereco(cliente.enderecos);
                } else {
                    $('#accEnderecos').innerHTML = '<p>Nenhum endereço cadastrado ainda.</p>';
                }

                renderPedidos(pedidos || []);
                renderFavoritos(favoritos || []);
            } catch (err) {
                console.error('Erro ao carregar a conta:', err);
                $('#accPedidos').innerHTML = '<p>Não foi possível carregar seus pedidos.</p>';
                $('#accEnderecos').innerHTML = '<p>Não foi possível carregar seus endereços.</p>';
                $('#accFavoritos').innerHTML = '<p>Não foi possível carregar seus favoritos.</p>';
            }
        };

        $('#salvarEndereco')?.addEventListener('click', async e => {
            e.preventDefault();
            const body = {
                noEndereco: $('#accEndereco').value.trim(),
                nrNumero: $('#accNumero').value.trim(),
                nrCep: $('#accCep').value.replace(/\D/g, ''),
                noCidade: $('#accCidade').value.trim(),
                sgUf: $('#accUf').value.trim().toUpperCase()
            };
            if (!body.noEndereco || !body.noCidade || body.sgUf.length !== 2) {
                return alert('Preencha endereço, cidade e UF.');
            }

            const btn = $('#salvarEndereco');
            btn.disabled = true;
            btn.textContent = 'Salvando...';
            try {
                await getJson(`${API_URL}/clientes/${sessao.clienteId}/endereco`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                await carregarConta();
                btn.textContent = 'Salvo ✓';
            } catch (err) {
                alert(err.message);
                btn.textContent = 'Salvar endereço';
            } finally {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = 'Salvar endereço';
                }, 1400);
            }
        });

        carregarConta();
    }
}

document.addEventListener('click', e => {
    const out = e.target.closest('[data-logout]');
    if (out) {
        e.preventDefault();
        localStorage.removeItem('usuarioLogado');
        location.href = 'login.html';
    }
});

/* perfil do depósito (dono da loja) */
const salvarPerfil = $('#salvarPerfil');
if (salvarPerfil) {
    let sessao = null;
    try {
        sessao = JSON.parse(localStorage.getItem('usuarioLogado') || 'null');
    } catch {
        sessao = null;
    }

    if (!sessao || sessao.tipoUsuario !== 'DONO_LOJA' || !sessao.lojaId) {
        location.href = 'login.html';
    } else {
        const val = id => $(id).value.trim();

        const preencher = loja => {
            const end = loja.enderecos?.[0] || {};
            $('#lojaNome').value = loja.noLoja || '';
            $('#lojaEmail').value = loja.usuario?.noEmail || sessao.email || '';
            $('#lojaTelefone').value = loja.telefones?.[0]?.nrTelefone || '';
            $('#lojaCep').value = end.nrCep || '';
            $('#lojaEndereco').value = end.noEndereco || '';
            $('#lojaNumero').value = end.nrNumero || '';
            $('#lojaCidade').value = end.noCidade || '';
            $('#lojaUf').value = end.sgUf || '';
        };

        fetch(`${API_URL}/lojas/${sessao.lojaId}`)
            .then(res => res.ok ? res.json() : Promise.reject(new Error('Não foi possível carregar os dados da loja.')))
            .then(preencher)
            .catch(err => {
                console.error(err);
                alert(err.message);
            });

        const cep = $('#lojaCep');
        let ultimoCep = '';

        const buscarCep = async () => {
            const digits = cep.value.replace(/\D/g, '');
            if (digits.length !== 8 || digits === ultimoCep) return;
            ultimoCep = digits;
            try {
                const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
                const dados = await res.json();
                if (dados.erro) {
                    ultimoCep = '';
                    return;
                }
                $('#lojaEndereco').value = dados.logradouro || '';
                $('#lojaCidade').value = dados.localidade || '';
                $('#lojaUf').value = dados.uf || '';
                $('#lojaNumero').focus();
            } catch (err) {
                console.error('Erro ao buscar CEP:', err);
                ultimoCep = '';
            }
        };

        cep.addEventListener('input', () => {
            let v = cep.value.replace(/\D/g, '').slice(0, 8);
            if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
            cep.value = v;
            if (v.replace(/\D/g, '').length === 8) buscarCep();
        });
        cep.addEventListener('blur', buscarCep);

        salvarPerfil.addEventListener('click', async e => {
            e.preventDefault();
            salvarPerfil.disabled = true;
            salvarPerfil.textContent = 'Salvando...';
            try {
                const body = {
                    noLoja: val('#lojaNome'),
                    email: val('#lojaEmail'),
                    nrTelefone: val('#lojaTelefone'),
                    nrCep: val('#lojaCep'),
                    noEndereco: val('#lojaEndereco'),
                    nrNumero: val('#lojaNumero'),
                    noCidade: val('#lojaCidade'),
                    sgUf: val('#lojaUf').toUpperCase()
                };

                const res = await fetch(`${API_URL}/lojas/${sessao.lojaId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const result = await lerResposta(res);
                if (!res.ok) throw new Error(result.error || 'Erro ao salvar os dados.');

                localStorage.setItem('usuarioLogado', JSON.stringify({ ...sessao, nome: body.noLoja, email: body.email }));

                salvarPerfil.textContent = 'Salvo ✓';
                setTimeout(() => {
                    salvarPerfil.textContent = 'Salvar';
                    salvarPerfil.disabled = false;
                }, 1400);
            } catch (err) {
                alert(err.message);
                salvarPerfil.textContent = 'Salvar';
                salvarPerfil.disabled = false;
            }
        });
    }
}

