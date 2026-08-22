document.addEventListener('DOMContentLoaded',()=>{
  const input=document.querySelector('input[name="barcode_photo"]');
  if(!input)return;
  const capture=input.closest('.capture');
  const button=document.createElement('a');button.className='button secondary small';button.href='?page=scan&return=add';button.textContent='Open achtercamera en scan barcode';
  const status=document.createElement('small');status.className='muted';status.textContent='Dezelfde betrouwbare scanner als in het scanmenu wordt gebruikt.';
  capture.append(button,status);
  const barcode=sessionStorage.getItem('barcode-for-add');
  if(barcode){sessionStorage.removeItem('barcode-for-add');document.querySelector('#barcode').value=barcode;status.textContent=`Barcode ${barcode} gescand. Gegevens ophalen…`;lookupBarcode();}
});
