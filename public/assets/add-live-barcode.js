document.addEventListener('DOMContentLoaded',()=>{
  const input=document.querySelector('input[name="barcode_photo"]');
  if(!input)return;
  const capture=input.closest('.capture');
  const button=document.createElement('a');button.className='button secondary small';button.href='?page=scan&return=add';button.textContent='Open achtercamera en scan barcode';
  const status=document.createElement('small');status.className='muted';status.textContent='Dezelfde betrouwbare scanner als in het scanmenu wordt gebruikt.';
  capture.append(button,status);
  const saved=sessionStorage.getItem('barcode-for-add');
  if(saved){sessionStorage.removeItem('barcode-for-add');let data;try{data=JSON.parse(saved);}catch(error){data={barcode:saved,photo:''};}document.querySelector('#barcode').value=data.barcode;if(data.photo){const hidden=document.createElement('input');hidden.type='hidden';hidden.name='scan_photo';hidden.value=data.photo;document.querySelector('form[enctype]').append(hidden);}status.textContent=`Barcode ${data.barcode} gescand en foto bewaard. Gegevens ophalen…`;lookupBarcode();}
});
