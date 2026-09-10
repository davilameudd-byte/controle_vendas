/* Catálogo público: não acessa documentos da gestão. */
(function () {
  const grid = document.getElementById('grid-produtos');
  const status = document.getElementById('catalog-status');
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function message(text) { status.textContent = text; }
  function render(products) {
    grid.replaceChildren();
    for (const p of products) {
      if (!p || typeof p.name !== 'string' || !Number.isFinite(p.price) || p.price <= 0) continue;
      const card = document.createElement('article'); card.className = 'card live-product';
      const media = document.createElement('div'); media.className = 'product-media';
      const fallback = document.createElement('span'); fallback.className = 'product-no-photo'; fallback.textContent = 'Imagem em breve';
      media.append(fallback);
      if (typeof p.imageUrl === 'string' && /^https:\/\//i.test(p.imageUrl)) {
        const img = document.createElement('img'); img.src = p.imageUrl; img.alt = p.name; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
        img.onload = () => { fallback.hidden = true; }; img.onerror = () => { img.remove(); fallback.hidden = false; }; media.append(img);
      }
      const title = document.createElement('h3'); title.textContent = p.name;
      const category = document.createElement('div'); category.className = 'note'; category.textContent = p.category || 'Perfumes';
      const price = document.createElement('div'); price.className = 'price'; price.textContent = money.format(p.price);
      const availability = document.createElement('div'); availability.className = 'product-availability'; availability.textContent = p.available ? 'Disponível em estoque' : 'Esgotado';
      const action = document.createElement(p.available ? 'a' : 'span'); action.className = 'order';
      if (p.available) { action.href = linkPedido(p.name); action.textContent = 'Pedir no WhatsApp'; }
      else { action.textContent = 'Indisponível no momento'; action.classList.add('unavailable'); }
      card.append(media, title, category, price, availability, action); grid.append(card);
    }
    message(grid.childElementCount ? '' : 'Novidades em breve. Consulte a disponibilidade pelo WhatsApp.');
  }
  try {
    const app = firebase.initializeApp({ apiKey:'AIzaSyBTeyeblOVhgKSbyhaeczixPN4QMGKOw0o', authDomain:'peste-5df22.firebaseapp.com', projectId:'peste-5df22', appId:'1:703481494502:web:1560cf8e5f7700ed033427' });
    app.firestore().collection('publicCatalog').doc('mala-mia').onSnapshot(snap => {
      const data = snap.exists ? snap.data() : {};
      render(Array.isArray(data.products) ? data.products : []);
    }, () => { grid.replaceChildren(); message('Não foi possível atualizar o catálogo. Recarregue a página ou consulte pelo WhatsApp.'); });
  } catch (_) { message('Não foi possível carregar o catálogo. Recarregue a página ou consulte pelo WhatsApp.'); }
})();
