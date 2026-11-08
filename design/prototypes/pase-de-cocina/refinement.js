/* Interacciones de demostración: no accede al ERP ni persiste datos. */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const isAcai = location.pathname.endsWith('acai.html');
  const isBurger = location.pathname.endsWith('burger.html');
  const money = amount => `Bs. ${amount.toFixed(2).replace('.', ',')}`;

  if (isAcai && params.get('state') === 'waiting') document.body.classList.add('view-waiting');

  const ticket = document.querySelector('.pos-layout > .ticket');
  if (ticket && params.get('order') === 'long') {
    const list = ticket.querySelector('.ticket-lines');
    if (isBurger) {
      const entries = [
        ['Hamburguesa especial de la casa con nombre deliberadamente extenso', 36, [['Queso extra', 5], ['Tocino', 7]], 2],
        ['Limonada', 12, [], 1], ['Pollo crispy', 31, [['Salsa especial', 4]], 2],
        ['Combo Doble + papas + bebida', 58, [], 1], ['Papas', 15, [], 3],
        ['Hamburguesa Clásica', 28, [['Queso extra', 5]], 1]
      ];
      list.innerHTML = entries.map(([name, base, modifiers, qty]) => {
        const unit = base + modifiers.reduce((sum, item) => sum + item[1], 0);
        return `<div class="ticket-item"><div class="ticket-item-top"><div><strong>${name}</strong><span class="line-price num">Base · ${money(base)}</span></div><span class="price num">${money(unit * qty)}</span></div>${modifiers.map(([label, price]) => `<div class="modifier-detail"><span>+ ${label}</span><strong class="num">${money(price)}</strong></div>`).join('')}<div class="line-total"><span>Total de línea · ${qty} ${qty === 1 ? 'unidad' : 'unidades'}</span><strong class="num">${money(unit * qty)}</strong></div><div class="quantity"><button class="qty-button" type="button" aria-label="Reducir cantidad de ${name}">−</button><span class="qty-number">${qty}</span><button class="qty-button" type="button" aria-label="Aumentar cantidad de ${name}">+</button><button class="remove-item" type="button" aria-label="Eliminar ${name} del pedido">Eliminar</button></div></div>`;
      }).join('');
      const total = entries.reduce((sum, [,base, modifiers, qty]) => sum + (base + modifiers.reduce((s, item) => s + item[1], 0)) * qty, 0);
      ticket.querySelectorAll('.ticket-footer .num').forEach(el => el.textContent = money(total));
      document.querySelector('.mobile-checkout .num').textContent = money(total);
      ticket.querySelector('.ticket-head p').textContent = `${entries.length} productos · pedido extenso de demostración`;
      document.querySelector('.mobile-order-trigger small').textContent = `Revisar pedido · ${entries.length} productos`;
    } else if (isAcai && params.get('state') === 'extras') {
      const extras = [['Granola', 6], ['Brownie', 7], ['Bebida', 10], ['Granola', 6], ['Brownie', 7], ['Bebida', 10]];
      list.insertAdjacentHTML('beforeend', extras.map(([name, price]) => `<div class="ticket-item"><div class="ticket-item-top"><div><strong>${name}</strong><p>Complemento de demostración</p></div><span class="price num">${money(price)}</span></div></div>`).join(''));
      const total = 55.52 + extras.reduce((sum, item) => sum + item[1], 0);
      ticket.querySelectorAll('.ticket-footer .num').forEach(el => el.textContent = money(total));
      document.querySelector('.mobile-checkout.extras-only .num').textContent = money(total);
    }
  }

  const sheet = document.getElementById('order-sheet');
  if (sheet && ticket) {
    const clone = ticket.cloneNode(true);
    clone.removeAttribute('id');
    clone.removeAttribute('aria-labelledby');
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    sheet.querySelector('.sheet-content').append(clone);
    const triggers = [...document.querySelectorAll('.mobile-order-trigger')];
    let origin;
    triggers.forEach(trigger => trigger.addEventListener('click', () => {
      origin = trigger;
      trigger.setAttribute('aria-expanded', 'true');
      sheet.showModal();
      sheet.querySelector('.sheet-close').focus();
    }));
    sheet.querySelector('.sheet-close').addEventListener('click', () => sheet.close());
    sheet.addEventListener('close', () => {
      triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
      origin?.focus();
    });
    sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
  }

  if (isBurger) {
    const dialog = document.getElementById('modifier-dialog');
    const updateTotal = () => {
      const extra = [...dialog.querySelectorAll('input:checked')].reduce((sum, input) => sum + Number(input.dataset.price), 0);
      dialog.querySelector('#modifier-additional').textContent = money(extra);
      dialog.querySelector('#modifier-total').textContent = money(42 + extra);
    };
    dialog.querySelectorAll('input').forEach(input => input.addEventListener('change', updateTotal));
    const close = () => dialog.close();
    dialog.querySelectorAll('.close-modifier,.confirm-modifier').forEach(button => button.addEventListener('click', close));
    dialog.addEventListener('close', () => {
      history.replaceState(null, '', 'burger.html');
      document.body.classList.remove('view-modifier');
      document.body.classList.add('view-products');
      document.querySelector('.modifier-link')?.focus();
    });
    if (params.get('view') === 'modifier') {
      dialog.showModal();
      dialog.querySelector('input').focus();
    }
    document.querySelectorAll('.category').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('.category').forEach(item => {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      const category = button.textContent.trim();
      document.querySelectorAll('.catalog-grid.products-only .product-card').forEach(card => {
        const type = card.querySelector('.type').textContent.trim();
        const matches = category === 'Todos' ||
          (category === 'Hamburguesas' && type === 'Hamburguesa') ||
          (category === 'Acompañamientos' && type === 'Acompañamiento') ||
          (category === 'Bebidas' && type === 'Bebida') || type === category;
        card.hidden = !matches;
      });
    }));
    if (params.get('catalog') === 'large') {
      const grid = document.querySelector('.catalog-grid.products-only');
      const originals = [...grid.children];
      for (let i = originals.length; i < 20; i++) {
        const card = originals[i % originals.length].cloneNode(true);
        card.querySelector('h3').textContent += ` · ejemplo ${i + 1}`;
        card.querySelector('.add-button').setAttribute('aria-label', `Agregar producto de demostración ${i + 1}`);
        grid.append(card);
      }
      document.querySelector('.tabs .count').textContent = '20';
      document.querySelector('.pos-section-title p').textContent = 'Catálogo amplio · datos de demostración';
    }
    if (params.get('selected') === '1') document.querySelector('.catalog-grid.products-only .product-card')?.classList.add('is-selected');
    if (params.get('disabled') === '1') {
      const card = document.querySelector('.catalog-grid.products-only .product-card:last-child');
      card?.classList.add('is-disabled');
      card?.querySelector('.add-button')?.setAttribute('disabled', '');
    }
  }
});
