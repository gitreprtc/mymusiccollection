(() => {
  const coverInputs = () => document.querySelectorAll('input[type="file"][name="cover"]');

  function openCropper(input, file) {
    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      window.alert('Deze foto kan op dit apparaat niet worden geopend om bij te snijden. Kies bij voorkeur een JPG-foto.');
    };
    image.onload = () => {
      const size = 800;
      let zoom = 1;
      let offsetX = 0;
      let offsetY = 0;
      let pointer = null;

      const dialog = document.createElement('div');
      dialog.className = 'cover-crop-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.tabIndex = -1;
      dialog.innerHTML = `
        <section class="cover-crop-card" aria-labelledby="cover-crop-title">
          <h2 id="cover-crop-title">Albumhoes bijsnijden</h2>
          <p>Sleep de foto om het juiste vierkant te kiezen en gebruik de schuifregelaar om in te zoomen.</p>
          <canvas width="${size}" height="${size}" aria-label="Voorbeeld van de uitsnede"></canvas>
          <label>Inzoomen <input type="range" min="1" max="3" value="1" step="0.01"></label>
          <div class="cover-crop-actions">
            <button type="button" class="secondary" data-action="original">Origineel gebruiken</button>
            <button type="button" data-action="crop">Crop gebruiken</button>
          </div>
          <button type="button" class="cover-crop-cancel" data-action="cancel">Annuleren</button>
        </section>`;

      const canvas = dialog.querySelector('canvas');
      const context = canvas.getContext('2d');
      const range = dialog.querySelector('input[type="range"]');

      const scale = () => Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
      const constrain = () => {
        const overflowX = Math.max(0, (image.naturalWidth * scale() - size) / 2);
        const overflowY = Math.max(0, (image.naturalHeight * scale() - size) / 2);
        offsetX = Math.max(-overflowX, Math.min(overflowX, offsetX));
        offsetY = Math.max(-overflowY, Math.min(overflowY, offsetY));
      };
      const draw = () => {
        constrain();
        const width = image.naturalWidth * scale();
        const height = image.naturalHeight * scale();
        context.clearRect(0, 0, size, size);
        context.drawImage(image, (size - width) / 2 + offsetX, (size - height) / 2 + offsetY, width, height);
      };
      const close = () => {
        URL.revokeObjectURL(imageUrl);
        document.body.classList.remove('cover-crop-open');
        dialog.remove();
      };

      range.addEventListener('input', () => {
        zoom = Number(range.value);
        draw();
      });
      canvas.addEventListener('pointerdown', event => {
        pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener('pointermove', event => {
        if (!pointer || pointer.id !== event.pointerId) return;
        const rect = canvas.getBoundingClientRect();
        offsetX += (event.clientX - pointer.x) * size / rect.width;
        offsetY += (event.clientY - pointer.y) * size / rect.height;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        draw();
      });
      canvas.addEventListener('pointerup', () => { pointer = null; });
      canvas.addEventListener('pointercancel', () => { pointer = null; });

      dialog.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        input.value = '';
        close();
      });
      dialog.querySelector('[data-action="original"]').addEventListener('click', close);
      dialog.querySelector('[data-action="crop"]').addEventListener('click', () => {
        const currentScale = scale();
        const sourceSize = size / currentScale;
        const sourceX = (image.naturalWidth - sourceSize) / 2 - offsetX / currentScale;
        const sourceY = (image.naturalHeight - sourceSize) / 2 - offsetY / currentScale;
        const outputSize = Math.max(1, Math.min(1600, Math.round(sourceSize)));
        const output = document.createElement('canvas');
        output.width = output.height = outputSize;
        output.getContext('2d').drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
        output.toBlob(blob => {
          if (!blob) return;
          const transfer = new DataTransfer();
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'albumhoes';
          transfer.items.add(new File([blob], `${baseName}-crop.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
          input.files = transfer.files;
          close();
        }, 'image/jpeg', 0.92);
      });

      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          input.value = '';
          close();
        }
      });
      document.body.append(dialog);
      document.body.classList.add('cover-crop-open');
      draw();
      dialog.focus();
    };
    image.src = imageUrl;
  }

  document.addEventListener('DOMContentLoaded', () => {
    coverInputs().forEach(input => input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (file && file.type.startsWith('image/')) openCropper(input, file);
    }));
  });
})();
