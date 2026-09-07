import {g} from './games-i18n.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function opponentsMarkup(party,language,g){
  return '<div class="uno-opponents">'+party.players.map(player=>{
    const count=party.uno?.counts.find(c=>c.id===player.id)?.count||0;
    return `<section class="uno-opponent player-${player.number} ${party.uno?.turn===player.id?'uno-active-player':''}" data-uno-player="${player.id}" ${party.uno?.turn===player.id?'aria-current="true"':''}><strong>${esc(player.name||g(language,'player',{n:player.number}))} · ${g(language,'cards',{n:count})}</strong><div class="uno-backs">${Array.from({length:Math.min(count,14)},(_,i)=>`<span class="uno-back" aria-hidden="true">✦</span>`).join('')}</div></section>`;
  }).join('')+'</div>';
}
export function turnMarkup(party,language){
  const player=party.players.find(p=>p.id===party.uno?.turn);if(!player||party.phase!=='playing')return '';
  return `<div class="uno-turn-banner player-${player.number}">${player.avatar?`<img class="player-avatar" src="${esc(player.avatar)}" alt="">`:`<span class="player-number">${player.number}</span>`}<div><small>${g(language,'playingNow')}</small><strong>${esc(player.name||g(language,'player',{n:player.number}))}</strong></div><span class="uno-turn-arrow" aria-hidden="true">▼</span></div>`;
}
export function animateUno(app,event,face){
  if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const player=app.querySelector(`[data-uno-player="${event.player}"]`),table=app.querySelector('.uno-table'),layer=app.querySelector('.uno-motion-layer');
  const deck=app.querySelector('.uno-deck'),discard=table?.querySelector('.uno-card');
  const source=event.type==='play'?player:deck,target=event.type==='play'?discard:player;
  if(!source||!target||!layer)return;
  const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
  for(let i=0;i<Math.min(event.count||1,7);i++){
    const card=document.createElement('div');card.className='uno-flight';
    card.innerHTML=event.type==='play'?face(event.card):'<div class="uno-back">✦</div>';
    card.style.left=(a.left+a.width/2-35)+'px';card.style.top=(a.top+a.height/2-50)+'px';
    layer.appendChild(card);
    const end=`translate(${b.left+b.width/2-a.left-a.width/2}px,${b.top+b.height/2-a.top-a.height/2}px) rotate(12deg)`;
    if(card.animate){const animation=card.animate([{transform:'translate(0,0) rotate(-12deg)',opacity:1},{transform:end,opacity:1}],{duration:450,delay:i*85,fill:'both',easing:'ease-in-out'});animation.onfinish=()=>card.remove();}
    else {card.style.transition='transform .45s, opacity .45s';setTimeout(()=>{card.style.transform=end;},20+i*85);}
    setTimeout(()=>card.remove(),1200+i*85);
  }
}
