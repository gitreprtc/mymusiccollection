document.addEventListener('DOMContentLoaded',()=>{
  const navButton=document.querySelector('#update-button');
  const checkButton=document.querySelector('#check-updates');
  const message=document.querySelector('#update-message');
  const installForm=document.querySelector('#install-update-form');
  let checking=false;
  const check=async()=>{
    if(checking) return;
    checking=true;
    if(message) message.textContent='GitHub wordt gecontroleerd op een nieuwe versie…';
    if(checkButton){checkButton.disabled=true;checkButton.textContent='Controleren…';}
    try{
      const response=await fetch('?action=update-status',{cache:'no-store',headers:{Accept:'application/json'}});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Updatecontrole is niet beschikbaar.');
      if(data.available){
        navButton?.classList.add('update-available');
        if(navButton) navButton.textContent='Update beschikbaar';
        installForm?.removeAttribute('hidden');
        if(message) message.textContent=`Versie ${data.version} staat klaar op GitHub.`;
      }else{
        navButton?.classList.remove('update-available');
        if(navButton) navButton.textContent='Updates';
        installForm?.setAttribute('hidden','');
        if(message) message.textContent=`Je gebruikt versie ${data.current||'onbekend'}; er is geen nieuwere versie.`;
      }
    }catch(error){
      if(message) message.textContent=error.message||'Updatecontrole is tijdelijk niet beschikbaar.';
    }finally{
      checking=false;
      if(checkButton){checkButton.disabled=false;checkButton.textContent='Nu controleren op updates';}
    }
  };
  check();
  checkButton?.addEventListener('click',check);
});
