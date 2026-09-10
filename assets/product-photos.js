/* Fotos em documentos separados: evita aumentar o documento de estoque. */
window.ProductPhotos = (() => {
  const cache = new Map();
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id);
  async function resolve(db, product) {
    if (!validId(product.imageId)) return /^https:\/\//i.test(product.imageUrl || '') ? product.imageUrl : '';
    if (!cache.has(product.imageId)) {
      const request = db.collection('productImages').doc(product.imageId).get().then(snap => {
        const value = snap.exists ? snap.data().dataUrl : '';
        if (typeof value !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value) || value.length > 200000) throw Error('Foto indisponível');
        return value;
      }).catch(err => { cache.delete(product.imageId); throw err; });
      cache.set(product.imageId, request);
    }
    return cache.get(product.imageId);
  }
  async function prepare(file) {
    if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('Escolha uma foto JPG, PNG ou WebP.');
    if (file.size > 20 * 1024 * 1024) throw Error('A foto deve ter até 20 MB.');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((ok, fail) => { img.onload = ok; img.onerror = () => fail(Error('Não foi possível abrir a foto. Escolha outro arquivo.')); img.src = url; });
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      for (const quality of [.85,.7,.55,.4,.25]) {
        const dataUrl = canvas.toDataURL('image/jpeg',quality);
        if (dataUrl.length <= 200000) return dataUrl;
      }
      throw Error('Esta imagem é muito detalhada. Escolha uma versão menor.');
    } finally { URL.revokeObjectURL(url); }
  }
  return {resolve, prepare, validId};
})();
