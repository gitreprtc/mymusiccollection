document.addEventListener('DOMContentLoaded',()=>{
  const navButton=document.querySelector('#update-button');
  const checkButton=document.querySelector('#check-updates');
  const message=document.querySelector('#update-message');
  const installForm=document.querySelector('#install-update-form');
  const commitPanel=document.querySelector('#release-commit');
  const historyPanel=document.querySelector('#release-history');
  let checking=false;

  const renderCommit=commit=>{
    if(!commitPanel) return;
    commitPanel.replaceChildren();
    if(!commit?.sha||!commit?.url){
      commitPanel.hidden=true;
      return;
    }
    const label=document.createElement('span');
    const link=document.createElement('a');
    label.textContent='Releasecommit';
    link.href=commit.url;
    link.target='_blank';
    link.rel='noopener';
    link.textContent=`${commit.sha} · ${commit.message||'Bekijk commit op GitHub'}`;
    commitPanel.append(label,link);
    commitPanel.hidden=false;
  };

  const renderHistory=releases=>{
    if(!historyPanel) return;
    historyPanel.replaceChildren();
    if(!Array.isArray(releases)||releases.length===0){
      const empty=document.createElement('p');
      empty.className='muted';
      empty.textContent='Er zijn nog geen release notes beschikbaar.';
      historyPanel.append(empty);
      return;
    }
    for(const release of releases){
      const article=document.createElement('article');
      const heading=document.createElement('h3');
      const date=document.createElement('time');
      const notes=document.createElement('ul');
      article.className='release-entry';
      heading.textContent=`Versie ${release.version||'onbekend'}`;
      date.dateTime=release.released||'';
      date.textContent=release.released||'Datum onbekend';
      for(const note of Array.isArray(release.notes)?release.notes:[]){
        const item=document.createElement('li');
        item.textContent=note;
        notes.append(item);
      }
      article.append(heading,date);
      if(notes.childElementCount) article.append(notes);
      historyPanel.append(article);
    }
  };

  const check=async()=>{
    if(checking) return;
    checking=true;
    if(message) message.textContent='GitHub wordt gecontroleerd op een nieuwe versie…';
    if(checkButton){checkButton.disabled=true;checkButton.textContent='Controleren…';}
    try{
      const details=historyPanel?'&details=1':'';
      const response=await fetch(`?action=update-status${details}`,{cache:'no-store',headers:{Accept:'application/json'}});
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
      renderCommit(data.commit);
      renderHistory(data.releases);
    }catch(error){
      if(message) message.textContent=error.message||'Updatecontrole is tijdelijk niet beschikbaar.';
      if(historyPanel){
        historyPanel.replaceChildren();
        const unavailable=document.createElement('p');
        unavailable.className='muted';
        unavailable.textContent='De release notes konden niet worden geladen.';
        historyPanel.append(unavailable);
      }
    }finally{
      checking=false;
      if(checkButton){checkButton.disabled=false;checkButton.textContent='Nu controleren op updates';}
    }
  };
  check();
  checkButton?.addEventListener('click',check);
});
