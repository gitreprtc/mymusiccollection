document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.querySelector('#start-scan');
  if (!startButton) return;

  const reader = document.querySelector('#scanner-reader');
  const status = document.querySelector('#scan-status');
  const captureButton = document.querySelector('#capture-scan');
  const torchButton = document.querySelector('#toggle-torch');
  const manualInput = document.querySelector('#manual-barcode');
  const manualButton = document.querySelector('#check-manual-barcode');
  const csrf = document.querySelector('#csrf-token')?.dataset.token || '';
  const storeMode = new URLSearchParams(location.search).get('mode') === 'store';
  let scanner = null;
  let running = false;
  let busy = false;
  let torchEnabled = false;
  let recentReads = [];

  const digitsOnly = value => String(value || '').replace(/\D/g, '');
  const validBarcode = value => {
    const digits = digitsOnly(value);
    if (![8, 12, 13, 14].includes(digits.length)) return false;
    let sum = 0;
    for (let index = 0; index < digits.length - 1; index += 1) {
      sum += Number(digits[index]) * (((digits.length - 2 - index) % 2 === 0) ? 3 : 1);
    }
    return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
  };

  const setStatus = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
  };

  const stopScanner = async () => {
    if (!scanner || !running) return;
    running = false;
    try { await scanner.stop(); } catch (error) { /* Camera may already be gone. */ }
    try { await scanner.clear(); } catch (error) { /* Nothing rendered. */ }
    reader.hidden = true;
    captureButton.hidden = true;
    torchButton.hidden = true;
    torchEnabled = false;
    startButton.textContent = 'Open achtercamera';
    startButton.setAttribute('aria-pressed', 'false');
  };

  const finishBarcode = async (value, photo = '') => {
    if (busy) return;
    busy = true;
    const barcode = digitsOnly(value);
    await stopScanner();
    setStatus(`Barcode ${barcode} betrouwbaar gelezen.`, 'success');
    if (new URLSearchParams(location.search).get('return') === 'add') {
      sessionStorage.setItem('barcode-for-add', JSON.stringify({ barcode, photo }));
      location.href = '?page=add';
      return;
    }
    sessionStorage.setItem('barcode-scan-photo', photo);
    await checkOwned(barcode);
    busy = false;
  };

  const onDecoded = value => {
    if (busy || !validBarcode(value)) return;
    const barcode = digitsOnly(value);
    const now = Date.now();
    recentReads = recentReads.filter(read => now - read.time < 2500);
    recentReads.push({ barcode, time: now });
    const confirmations = recentReads.filter(read => read.barcode === barcode).length;
    setStatus(confirmations > 1 ? 'Barcode bevestigd, resultaat verwerken…' : 'Barcode gevonden, nog één keer bevestigen…');
    if (confirmations >= 2) finishBarcode(barcode);
  };

  const selectRearCamera = async () => {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) throw new Error('Geen camera gevonden.');
    const rearCameras = cameras.filter(camera => /back|rear|environment|achter/i.test(camera.label));
    const mainRear = rearCameras.find(camera => !/ultra|tele|macro|wide angle|groothoek/i.test(camera.label));
    return (mainRear || rearCameras[0] || cameras.at(-1)).id;
  };

  const exposeCameraControls = () => {
    captureButton.disabled = false;
    captureButton.hidden = false;
    try {
      const capabilities = scanner.getRunningTrackCapabilities();
      torchButton.hidden = !capabilities?.torch;
    } catch (error) {
      torchButton.hidden = true;
    }
  };

  const startScanner = async () => {
    if (running) {
      await stopScanner();
      setStatus('Camera gesloten.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.Html5Qrcode) {
      setStatus('Camera-scanning wordt niet ondersteund. Vul de barcode hieronder handmatig in.', 'error');
      manualInput.focus();
      return;
    }
    startButton.disabled = true;
    reader.hidden = false;
    setStatus('Camera openen…');
    recentReads = [];
    try {
      scanner = new Html5Qrcode('scanner-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.CODE_128
        ],
        useBarCodeDetectorIfSupported: true
      });
      const cameraId = await selectRearCamera();
      await scanner.start(
        {
          deviceId: { exact: cameraId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' }]
        },
        {
          fps: 12,
          disableFlip: true,
          qrbox: (width, height) => ({
            width: Math.floor(width * 0.9),
            height: Math.min(180, Math.floor(height * 0.42))
          })
        },
        onDecoded,
        () => {}
      );
      running = true;
      startButton.textContent = 'Camera sluiten';
      startButton.setAttribute('aria-pressed', 'true');
      exposeCameraControls();
      setStatus('Houd de hele barcode horizontaal binnen het kader. De scan gaat automatisch.', 'scanning');
    } catch (error) {
      try { await scanner?.clear(); } catch (clearError) { /* Start did not render fully. */ }
      reader.hidden = true;
      setStatus('De camera kon niet starten. Controleer cameratoestemming en HTTPS, of vul de barcode handmatig in.', 'error');
      manualInput.focus();
    } finally {
      startButton.disabled = false;
    }
  };

  const barcodeSnapshot = () => {
    const video = reader.querySelector('video');
    if (!video?.videoWidth) return null;
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const cropWidth = Math.floor(sourceWidth * 0.94);
    const cropHeight = Math.floor(sourceHeight * 0.58);
    const sourceX = Math.floor((sourceWidth - cropWidth) / 2);
    const sourceY = Math.floor((sourceHeight - cropHeight) / 2);
    const scale = Math.min(1, 1800 / cropWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(cropWidth * scale);
    canvas.height = Math.floor(cropHeight * scale);
    canvas.getContext('2d').drawImage(video, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const readPhoto = async () => {
    const canvas = barcodeSnapshot();
    if (!canvas || busy) return;
    busy = true;
    captureButton.disabled = true;
    setStatus('Scherpe barcodefoto controleren…');
    const image = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.94));
    if (!image) {
      setStatus('De barcodefoto kon niet worden gemaakt.', 'error');
      captureButton.disabled = false;
      busy = false;
      return;
    }
    const form = new FormData();
    form.append('barcode_photo', image, 'barcode.jpg');
    form.append('csrf', csrf);
    form.append('keep_photo', storeMode ? '0' : '1');
    try {
      const response = await fetch('?action=vision-barcode', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok || !data.barcode) throw new Error(data.error || 'De barcode kon niet worden gelezen.');
      busy = false;
      await finishBarcode(data.barcode, data.scan_photo || '');
    } catch (error) {
      setStatus(error.message || 'De cijfers konden niet betrouwbaar worden gelezen. Probeer opnieuw met meer licht.', 'error');
      captureButton.disabled = false;
      busy = false;
    }
  };

  const toggleTorch = async () => {
    if (!running) return;
    torchEnabled = !torchEnabled;
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: torchEnabled }] });
      torchButton.textContent = torchEnabled ? 'Lamp uit' : 'Lamp aan';
      torchButton.setAttribute('aria-pressed', String(torchEnabled));
    } catch (error) {
      torchEnabled = false;
      torchButton.hidden = true;
    }
  };

  const submitManual = () => {
    const barcode = digitsOnly(manualInput.value);
    if (!validBarcode(barcode)) {
      setStatus('Controleer de barcode: gebruik 8, 12, 13 of 14 cijfers met een geldig controlecijfer.', 'error');
      manualInput.focus();
      return;
    }
    finishBarcode(barcode);
  };

  startButton.addEventListener('click', startScanner);
  captureButton.addEventListener('click', readPhoto);
  torchButton.addEventListener('click', toggleTorch);
  manualButton.addEventListener('click', submitManual);
  manualInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitManual();
    }
  });
  window.addEventListener('pagehide', () => { stopScanner(); });
});
