document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('input[type="file"][name="cover"],input[type="file"][name="back"]').forEach(input=>{
    input.hidden=true;const card=input.closest('.capture');const kind=input.name==='cover'?'voorkant':'achterkant';
    const open=document.createElement('button');open.type='button';open.className='secondary small';open.textContent=`Open achtercamera voor ${kind}`;
    const panel=document.createElement('div');panel.hidden=true;const video=document.createElement('video');video.playsInline=true;video.autoplay=true;video.style.cssText='width:100%;margin-top:10px;border-radius:10px;background:#111';
    const take=document.createElement('button');take.type='button';take.className='small';take.textContent='Maak foto';const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary small';cancel.textContent='Annuleren';const note=document.createElement('small');note.className='muted';
    panel.append(video,take,cancel,note);card.append(open,panel);let stream;
    const stop=()=>{stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null;panel.hidden=true;open.hidden=false;};
    open.addEventListener('click',async()=>{try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});video.srcObject=stream;panel.hidden=false;open.hidden=true;note.textContent='Achtercamera actief.';}catch(error){note.textContent='De achtercamera kon niet worden geopend. Controleer cameratoestemming en HTTPS.';panel.hidden=false;}});
    cancel.addEventListener('click',stop);take.addEventListener('click',async()=>{if(!video.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(blob&&window.DataTransfer){const files=new DataTransfer();files.items.add(new File([blob],`${input.name}.jpg`,{type:'image/jpeg'}));input.files=files.files;note.textContent='Foto klaar om op te slaan.';}stop();});
  });
});
