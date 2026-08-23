const $ = (s) => document.querySelector(s);

async function lookupBarcode() {
  const barcode = $('#barcode')?.value.trim()||'';
  const status = $('#lookup-status');
  if (!barcode) { if(status) status.textContent = 'Vul eerst een barcode in.'; return; }
  if(status) status.textContent = 'Zoeken in MusicBrainz…';
  try {
    const response = await fetch(`?action=lookup&barcode=${encodeURIComponent(barcode)}`, {headers:{Accept:'application/json'}});
    const data = await response.json();
    if (!response.ok || !data.release) throw new Error(data.error || 'Geen uitgave gevonden');
    const r = data.release;
    if (r.title) $('#title').value = r.title;
    if (r.artist) $('#artist').value = r.artist;
    if (r.collectionFormat) $('#format').value = r.collectionFormat;
    if (r.tracks) $('#tracklist').value = r.tracks;
    if (r.track_artists && $('#track_artists')) $('#track_artists').value = r.track_artists;
    if (r.year && $('#release_year')) $('#release_year').value = r.year;
    if (r.duration_seconds && $('#duration_seconds')) $('#duration_seconds').value = r.duration_seconds;
    if ($('#is_compilation')) $('#is_compilation').checked=Boolean(r.is_compilation);
    if(status) status.textContent = `Voorstel ingevuld via ${r.source||'MusicBrainz'}${r.collectionFormat ? `; type automatisch ingesteld op ${r.collectionFormat}.` : '.'} Controleer en pas aan waar nodig.`;
  } catch (e) { if(status) status.textContent = e.message; }
}

async function scanBarcode() {
  const status = $('#scan-status'), video = $('#scanner-video');
  if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'Deze browser ondersteunt camera-scanning niet. Vul de barcode handmatig in.'; return; }
  if (!('BarcodeDetector' in window)) return scanBarcodeFallback();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
    video.srcObject=stream; video.hidden=false; await video.play();
    const detector = new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});
    status.textContent='Richt de camera op de barcode…';
    const scan = async () => {
      const found=await detector.detect(video);
      if(found[0]) { const value=found[0].rawValue; stream.getTracks().forEach(t=>t.stop()); video.hidden=true; status.innerHTML=`Barcode <strong>${value}</strong> gescand.`; const target=$('#barcode'); if(target){target.value=value; lookupBarcode();} else checkOwned(value); return; }
      requestAnimationFrame(scan);
    }; scan();
  } catch(e) { status.textContent='Camera kon niet worden geopend. Geef cameratoestemming en gebruik HTTPS.'; }
}
async function scanBarcodeFallback() {
  const status=$('#scan-status'), box=$('#scanner-fallback');
  try {
    status.textContent='Camera-scanner laden…'; box.hidden=false;
    const {Html5Qrcode}=window;if(!Html5Qrcode)throw new Error('Scanner niet geladen');
    const scanner=new Html5Qrcode('scanner-fallback');
    await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:250,height:150}},async value=>{
      await scanner.stop();box.hidden=true; status.innerHTML=`Barcode <strong>${value}</strong> gescand.`;
      const target=$('#barcode'); if(target){target.value=value;lookupBarcode();}else checkOwned(value);
    });
    status.textContent='Richt de camera op de barcode…';
  } catch(e) { box.hidden=true; status.textContent='Camera-scanner kon niet starten. Geef cameratoestemming en gebruik HTTPS.'; }
}
async function checkOwned(barcode) { const output=$('#scan-result'),storeMode=new URLSearchParams(location.search).get('mode')==='store';output.textContent='Albumgegevens opzoeken in MusicBrainz…';try{const r=await fetch('?action=check&barcode='+encodeURIComponent(barcode));const d=await r.json();if(d.found){output.innerHTML='✅ Je hebt deze: <strong>'+d.artist+' — '+d.title+'</strong> ('+d.format+').';return;}if(d.trashed){output.innerHTML='♻️ Dit album staat al in de prullenbak en kan niet opnieuw worden toegevoegd. <a href="?page=trash">Plaats het terug</a>.';return;}const suggestion=d.release?'MusicBrainz vindt: '+d.release.artist+' — '+d.release.title+' ('+d.release.format+(d.release.year?', '+d.release.year:'')+').':'MusicBrainz vond geen betrouwbare albumgegevens.';const ownedFormats=[...(d.same_album||[])].map(album=>album.format).filter(Boolean);if(ownedFormats.length){const formats=[...new Set(ownedFormats)].join(' en ');if(storeMode){output.innerHTML='⚠️ Je hebt dit album al in <strong>'+formats+'</strong>. De gescande versie is '+(d.release?.format||'onbekend')+'.';return;}const yes=window.confirm('Let op: je hebt dit album al in '+formats+'.\\n\\n'+suggestion+'\\n\\nWeet je zeker dat je deze '+(d.release?.format||'uitgave')+' wilt toevoegen?');if(yes)addScannedRecord(barcode);else output.textContent='Niet toegevoegd aan je collectie.';return;}if(storeMode){output.innerHTML='ℹ️ Niet in je collectie. '+suggestion;return;}const yes=window.confirm(suggestion+'\n\nDeze barcode staat nog niet in je collectie. Wil je dit album toevoegen?');if(yes){addScannedRecord(barcode);}else{output.textContent='Niet toegevoegd aan je collectie.';}}catch(error){output.textContent='Albumgegevens konden niet worden opgehaald. Probeer opnieuw.';} }
async function addScannedRecord(barcode){const output=$('#scan-result'),csrf=$('#csrf-token')?.dataset.token,form=new FormData();form.append('csrf',csrf||'');form.append('barcode',barcode);form.append('scan_photo',sessionStorage.getItem('barcode-scan-photo')||'');output.textContent='Albumgegevens ophalen en toevoegen…';try{const response=await fetch('?action=add-from-barcode',{method:'POST',body:form});const data=await response.json();if(!response.ok)throw new Error(data.error||'Toevoegen mislukt');sessionStorage.removeItem('barcode-scan-photo');output.innerHTML=`✅ Toegevoegd: <strong>${data.artist} — ${data.title}</strong> (${data.format}).${data.cover_warning?`<br><small>⚠️ ${data.cover_warning}</small>`:''}`;}catch(error){output.textContent=error.message||'Toevoegen mislukt.';}}
async function readText(source, target, mode) {
  const file=$(source)?.files?.[0], status=$('#ocr-status');
  if(!file){status.textContent='Kies of maak eerst de bijbehorende foto.';return;}
  status.textContent='Tekst wordt lokaal in je browser gelezen…';
  try {
    const {createWorker}=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');
    const worker=await createWorker('eng+nld');
    const {data:{text}}=await worker.recognize(file);
    await worker.terminate();
    const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(x=>x.length>1);
    if(mode==='cover') { if(!$('#artist').value) $('#artist').value=lines[0]||''; if(!$('#title').value) $('#title').value=lines.slice(1,3).join(' ')||''; }
    else $(target).value=lines.join('\n');
    status.textContent='Tekstvoorstel ingevuld — controleer het zorgvuldig voor je opslaat.';
  } catch(e) { status.textContent='Tekstherkenning is niet gelukt; vul de gegevens handmatig in.'; }
}
document.addEventListener('DOMContentLoaded',()=>{
  const menuToggle=$('#menu-toggle'), menu=$('#site-nav');
  menuToggle?.addEventListener('click',()=>{
    const open=menu?.classList.toggle('is-open')||false;
    menuToggle.setAttribute('aria-expanded',String(open));
    menuToggle.setAttribute('aria-label',open?'Menu sluiten':'Menu openen');
  });
  $('#lookup')?.addEventListener('click',lookupBarcode);
  let lastCheckedBarcode='';
  $('#barcode')?.addEventListener('blur',event=>{
    const barcode=event.currentTarget.value.trim();
    if(barcode.length<8 || barcode===lastCheckedBarcode) return;
    lastCheckedBarcode=barcode;
    lookupBarcode();
  });
  $('#read-cover')?.addEventListener('click',()=>readText('#cover','#artist','cover'));
  $('#read-back')?.addEventListener('click',()=>readText('#back','#tracklist','back'));
  const search=$('#filter'), format=$('#format-filter'), withinAlbum=$('#search-within-album'), count=$('#collection-count');
  const applyCollectionFilter=()=>{
    if(!search && !format) return;
    const query=(search?.value||'').trim().toLocaleLowerCase('nl-NL');
    const type=format?.value||'';
    let visible=0;
    document.querySelectorAll('.collection-list .record').forEach(record=>{
      const searchable=(record.dataset.search||'')+(withinAlbum?.checked?' '+(record.dataset.trackSearch||''):'');
      const matchesText=searchable.toLocaleLowerCase('nl-NL').includes(query);
      const matchesType=!type || record.dataset.format===type;
      record.hidden=!(matchesText && matchesType);
      if(!record.hidden) visible++;
    });
    if(count) count.textContent=`${visible} uitgave${visible===1?'':'s'}`;
  };
  search?.addEventListener('input',applyCollectionFilter);
  search?.addEventListener('search',applyCollectionFilter);
  format?.addEventListener('change',applyCollectionFilter);
  withinAlbum?.addEventListener('change',applyCollectionFilter);
});
