document.addEventListener('DOMContentLoaded',()=>{
  const input=document.querySelector('input[name="barcode_photo"]');
  if(!input)return;
  input.accept='image/*';input.setAttribute('capture','environment');input.hidden=true;
  const hint=input.closest('.capture')?.querySelector('small');if(hint)hint.textContent='Gebruik hieronder altijd de achtercamera';
  input.addEventListener('change',async()=>{
    const file=input.files?.[0]; let status=document.querySelector('#barcode-photo-status');
    if(!status){status=document.createElement('small');status.id='barcode-photo-status';status.className='muted';input.insertAdjacentElement('afterend',status);}
    if(!file)return;
    status.textContent='Barcode in foto lezen…';
    try{
      let value='';
      if('BarcodeDetector' in window){
        const bitmap=await createImageBitmap(file);
        const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});
        const result=await detector.detect(bitmap); bitmap.close(); value=result[0]?.rawValue||'';
      }
      if(!value){
        const container=document.createElement('div');container.id='barcode-file-reader';container.hidden=true;document.body.append(container);
        const {Html5Qrcode}=window;if(!Html5Qrcode)throw new Error('Scanner niet geladen');
        const scanner=new Html5Qrcode(container.id);try{value=await scanner.scanFile(file,true);}catch(error){}finally{container.remove();}
      }
      if(!value){
        status.textContent='Streepjes niet gevonden; de cijfers onder de barcode lezen…';
        const {createWorker}=await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js');
        const worker=await createWorker('eng');const {data:{text}}=await worker.recognize(file);await worker.terminate();
        const candidates=(text.match(/[0-9][0-9\s-]{6,16}[0-9]/g)||[]).map(item=>item.replace(/\D/g,'')).filter(item=>[8,12,13,14].includes(item.length));
        value=candidates.sort((a,b)=>b.length-a.length)[0]||'';
      }
      if(!value)throw new Error();
      document.querySelector('#barcode').value=value;
      status.textContent=`Barcode ${value} gevonden. Gegevens worden opgehaald…`;
      lookupBarcode();
    }catch(error){status.textContent='Barcode niet herkend. Maak een scherpere foto of vul hem handmatig in.';}
  });
});
