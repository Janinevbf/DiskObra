const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => 'R$' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const dep = document.body.dataset.area === 'deposito';
const pg = document.body.dataset.page || '';

/* header */
const nav = dep ? [['CATÁLOGO', 'deposito-perfil.html'], ['CADASTRAR', 'deposito-cadastrar-produto.html'], ['PEDIDOS', '#']]
    : [['PRODUTOS', 'produtos.html'], [document.body.dataset.nav2 || 'MEU CARRINHO', document.body.dataset.nav2 ? '#' : 'carrinho.html'], ['DEPÓSITOS', 'cadastro-deposito.html']];
$('#hd').outerHTML = `<header class="hd"><a class="logo" href="produtos.html">DISK<b></b>BRA</a>
<nav>${nav.map(n => `<a href="${n[1]}">${n[0]}</a>`).join('')}</nav>
<form class="search" onsubmit="event.preventDefault();location.href='produtos.html?q='+encodeURIComponent(this.q.value)"><input name="q" placeholder="Busque o que procura aqui...." aria-label="Buscar"><button aria-label="Buscar">🔍</button></form>
<a class="user" href="${dep ? 'deposito-perfil.html' : 'conta.html'}" aria-label="Minha conta">👤</a></header>`;

/* sidebar depósito */
const sb = $('#sidebar');
if (sb) sb.innerHTML = [['+ Cadastrar', 'deposito-cadastrar-produto.html'], ['🛒 Pedidos', '#'], ['📦 Estoque', '#'], ['👤 Perfil', 'deposito-perfil.html'], ['⚙ Configurações', '#']]
    .map(l => `<a href="${l[1]}" class="${location.pathname.endsWith(l[1]) ? 'on' : ''}">${l[0]}</a>`).join('');

/* produtos */
const stars = n => '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
const cart = JSON.parse(localStorage.getItem('cart') || '[{"n":"Furadeira Dewalt","p":899,"q":2},{"n":"Furadeira Dewalt","p":899,"q":2},{"n":"Furadeira Dewalt","p":899,"q":2},{"n":"Furadeira Dewalt","p":899,"q":2}]');
const save = () => localStorage.setItem('cart', JSON.stringify(cart));
const g = $('#grid');
if (g) {
    const q = (new URLSearchParams(location.search).get('q') || '').toLowerCase();
    g.innerHTML = Array.from({ length: 10 }, (_, i) => ({ n: 'Furadeira Dewalt', p: 899 })).filter(p => p.n.toLowerCase().includes(q)).map(p => `<article class="pc"><a class="img" href="produto.html">🪛</a><h3>${p.n}</h3><div class="stars">${stars(4)}</div><div class="pr">${fmt(p.p)}</div><button class="btn-or" data-add>Adicionar ao carrinho</button></article>`).join('') || '<p>Nenhum produto encontrado. Tente outro termo.</p>';
}
document.addEventListener('click', e => {
    if (e.target.matches('[data-add]')) { cart.push({ n: 'Furadeira Dewalt', p: 899, q: 1 }); save(); e.target.textContent = 'Adicionado ✓'; setTimeout(() => e.target.textContent = 'Adicionar ao carrinho', 1200) }
    const o = e.target.closest('.ord .top'); if (o) o.parentElement.classList.toggle('open');
});

/* carrinho */
const ct = $('#cart');
if (ct) {
    let frete = null;
    const draw = () => {
        ct.innerHTML = cart.length ? cart.map((c, i) => `<tr><td><span class="th">🪛</span>${c.n}</td><td>${fmt(c.p)}</td><td><div class="qty"><button data-m="${i}" aria-label="Diminuir">−</button><span>${c.q}</span><button data-p="${i}" aria-label="Aumentar">+</button></div></td><td><b>${fmt(c.p * c.q)}</b></td><td><button class="del" data-d="${i}" aria-label="Remover">🗑</button></td></tr>`).join('') : '<tr><td colspan="5">Seu carrinho está vazio. Escolha produtos para começar.</td></tr>';
        const sub = cart.reduce((s, c) => s + c.p * c.q, 0);
        $('#sub').textContent = fmt(sub); $('#fr').textContent = frete == null ? 'A definir' : fmt(frete); $('#tot').textContent = fmt(sub + (frete || 0)); save()
    };
    ct.addEventListener('click', e => {
        const b = e.target; const i = +(b.dataset.m ?? b.dataset.p ?? b.dataset.d);
        if (b.dataset.m !== undefined && cart[i].q > 1) cart[i].q--;
        if (b.dataset.p !== undefined) cart[i].q++;
        if (b.dataset.d !== undefined) cart.splice(i, 1); draw()
    });
    $('#calc').onclick = () => { const v = $('#cep').value.replace(/\D/g, ''); 
        if (v.length !== 8) { $('#cep').focus(); 
            return alert('Digite um CEP com 8 números.') } frete = 49.9; draw() };
    $('#buy').onclick = () => alert(cart.length ? 'Compra finalizada! (simulação)' : 'Adicione produtos ao carrinho.');
    draw();
}

/* formulários de autenticação */
$$('form[data-auth]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const m = $('.msg', f); m.textContent = ''; $$('.fld', f).forEach(x => x.classList.remove('err'));
    const bad = $$('input', f).find(i => !i.value.trim());
    if (bad) { bad.parentElement.classList.add('err'); bad.focus(); m.textContent = 'Preencha todos os campos.'; return }
    const pw = $$('input[type=password]', f);
    if (pw.length > 1 && pw[0].value !== pw[1].value) { pw[1].parentElement.classList.add('err'); m.textContent = 'As senhas não são iguais.'; return }
    location.href = f.dataset.auth
}));

/* formulário depósito */
$$('[data-save]').forEach(b => b.onclick = () => { b.textContent = 'Salvo ✓'; setTimeout(() => b.textContent = 'Salvar', 1400) });
