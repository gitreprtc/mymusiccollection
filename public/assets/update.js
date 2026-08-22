document.addEventListener('DOMContentLoaded',async()=>{
  const button=document.querySelector('#update-button');
  if(!button)return;
  const style=document.createElement('link');style.rel='stylesheet';style.href='assets/update.css';document.head.append(style);
  try{
    const response=await fetch('?action=update-status');const data=await response.json();
    if(data.available){button.classList.add('update-available');button.textContent='Update beschikbaar';}
    const message=document.querySelector('#update-message');
    if(message)message.textContent=data.available?`Versie ${data.version} staat klaar op GitHub.`:`Je gebruikt versie ${data.current||'onbekend'}; er is geen nieuwere versie.`;
  }catch(error){const message=document.querySelector('#update-message');if(message)message.textContent='Updatecontrole is tijdelijk niet beschikbaar.';}
});
