import {wolfRoleArt,createWolfScene} from './werewolf-art.js';
import {coveredActionsMarkup,coveredSecretMarkup} from './werewolf-cover-ui.js';
import {w,narration,wolfCue,wolfStageTitle} from './werewolf-text.js';
import {locationLabel,t} from './i18n.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function secretMarkup(game,language,name){
 const p=game?.private;if(!p)return '';
 return `${wolfRoleArt(p.role)}<strong>${w(language,p.role)}</strong>${game.nightMode==='openEyes'?coveredSecretMarkup(game,language,name):`<p>${w(language,p.role+'Help')} ${p.role==='wolf'?p.allies.map(name).map(esc).join(', '):''}</p>`}${p.inspection?`<p>${esc(name(p.inspection.target))}: <b>${w(language,p.inspection.wolf?'yesWolf':'noWolf')}</b></p>`:''}`;
}
export function createWerewolfView(app,role,{send,notice}){
 let state,online=false,key='',identity='',active=false,pressed=null,scene=null;
 const name=id=>{const p=state.party.players.find(p=>p.id===id);return p?.name||String(p?.number||'');};
 function hide(){pressed=null;const card=app.querySelector('[data-wolf-secret]');if(card){card.classList.remove('revealed');card.innerHTML=`${wolfRoleArt('hidden')}<strong>${w(state.language,'hidden')}</strong><small>${w(state.language,'hold')}</small>`;}}
 function reveal(event){const card=event.target.closest('[data-wolf-secret]');if(!active||!card||!state.party.werewolf?.private)return;event.preventDefault();pressed=event.pointerId??'keyboard';card.classList.add('revealed');card.innerHTML=secretMarkup(state.party.werewolf,state.language,name);if(event.pointerId!==undefined)card.setPointerCapture(event.pointerId);}
 app.addEventListener('pointerdown',reveal);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,()=>{if(pressed!==null)hide();});
 app.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat)reveal(e);});
 app.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')hide();});
 app.addEventListener('contextmenu',e=>{if(e.target.closest('[data-wolf-secret]'))e.preventDefault();});
 window.addEventListener('blur',hide);window.addEventListener('pagehide',hide);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});document.addEventListener('museum-settings-open',hide);
 app.addEventListener('click',e=>{if(!active)return;const b=e.target.closest('[data-wolf-target]');if(!b||b.disabled)return;send('wolfChoose',{sequence:state.party.werewolf.sequence,target:b.dataset.wolfTarget||null,...(b.dataset.potion?{potion:b.dataset.potion}:{})}).catch(error=>notice(error.message));});
 function render(){
  const s=state,p=s.party,g=p.werewolf,l=s.language,priv=g?.private,playing=s.phase==='playing'&&online;
  const night=g&&(['night','wolves','seer','witch'].includes(g.stage)||g.winner==='wolves'),cue=wolfCue(s);
  app.innerHTML=`<div class="wolf-shell ${role==='display'?'wolf-display':'wolf-phone'} ${night?'wolf-night':'wolf-day'} ${g?.winner?'wolf-victory':''} ${g?.nightMode==='openEyes'?'wolf-open-eyes':''}"><div class="wolf-sky" aria-hidden="true"><div class="wolf-moon"></div><div class="wolf-village">${Array.from({length:13},(_,i)=>`<i class="wolf-house house-${i%4}"></i>`).join('')}</div></div><header class="wolf-header"><div><small>RETRO_MUSEUM</small><h1>${w(l,'title')}</h1></div><button class="button ghost" data-fullscreen>${t(l,'fullscreen')}</button></header><main class="wolf-main"><section class="wolf-story"><div class="wolf-chapter">${g?`${w(l,night?'night':'day')} ${g.day||1}`:`${p.players.length} / 16`}</div><h2>${g?w(l,wolfStageTitle(g)):w(l,p.replayPending?'gathering':'reveal')}</h2><p>${g?narration(l,cue):w(l,p.replayPending?'gatheringHelp':'rules')}</p>${g||p.replayPending?`<div class="wolf-countdown" data-wolf-clock></div>`:`<p>${w(l,'minimum')}</p>`}${!online?`<p>${t(l,'disconnected')}</p>`:''}<div class="wolf-reconnection" data-wolf-reconnecting role="status"></div></section>
   ${role==='controller'&&priv?`<section class="wolf-private"><button class="wolf-secret" data-wolf-secret aria-label="${w(l,'hold')}"></button><p>${w(l,priv.alive?'alive':'dead')}</p>${!priv.alive?`<p>${w(l,'mayLeave')}</p>`:''}<div class="wolf-actions"></div></section>`:role==='controller'&&g?`<p class="wolf-spectator">${w(l,'spectator')}<br>${w(l,'mayLeave')}</p>`:''}
   ${role==='controller'&&!g&&online?`<p class="wolf-enrolled">${w(l,'enrolled')}</p>`:''}
   <section class="wolf-roster">${p.players.map(player=>{const person=g?.players.find(x=>x.id===player.id),dead=person&&!person.alive;return `<article class="wolf-person ${dead?'is-dead':''} ${g?.deaths.includes(player.id)?'wolf-fallen':''} ${g?.winners?.includes(player.id)?'wolf-winner':''}">${player.avatar?`<img src="${esc(player.avatar)}" alt="">`:`<div class="wolf-avatar">${player.number}</div>`}<strong>${esc(name(player.id))}</strong><small>${person?w(l,dead?'dead':'alive'):g?w(l,'spectator'):''}</small>${g?.winner&&person?`<b>${w(l,person.role)}</b>`:''}</article>`;}).join('')}</section>
   ${g&&['dawn','verdict','hunter'].includes(g.stage)?`<section class="wolf-result">${g.deaths.length?g.deaths.map(name).map(esc).join(' · '):w(l,'none')}</section>`:''}
   ${role==='controller'&&['solved','ended'].includes(s.phase)?`<button class="button primary" data-action="playAgain" ${!online||p.players.filter(x=>x.connected).length<4?'disabled':''}>${w(l,'replay')}</button><p>${w(l,'minimum')}</p>`:''}
  </main>${role==='display'?`<aside class="wolf-qr"><img src="/api/pair/qr?station=${s.station}&amp;session=${s.sessionId}" width="150" height="150" alt="QR"><p>${w(l,'join')}</p><strong>${p.players.length} / 16</strong></aside>`:''}<footer class="wolf-footer"><span>${locationLabel(l,s.room,s.station)}${g?` · ${w(l,g.nightMode==='openEyes'?'openEyes':'classic')}`:''}</span><small>${w(l,'voice')}</small></footer></div>`;
  const backdrop=app.querySelector('.wolf-sky');if(backdrop){scene||=createWolfScene();scene.classList.toggle('is-night',Boolean(night));scene.classList.toggle('is-paused',s.phase==='paused');backdrop.replaceWith(scene);}
  hide();
  const actions=app.querySelector('.wolf-actions');
  if(actions){
   const cover=coveredActionsMarkup(g,l,name,playing);if(cover!==null){actions.innerHTML=cover;return;}
   const targetButton=(id,label,potion)=>`<button class="button ${priv.choice===id?'active':''}" data-wolf-target="${id||''}" ${potion?`data-potion="${potion}"`:''} ${!playing?'disabled':''}>${esc(label)}</button>`;
   if(priv.canAct){
    if(g.stage==='witch')actions.innerHTML=`<p>${w(l,'victim')}: ${esc(priv.victim?name(priv.victim):w(l,'none'))}</p>${priv.potions.heal&&priv.victim?targetButton(null,w(l,'heal'),'heal'):`<p>${priv.healed?w(l,'saved'):''}</p>`}${priv.potions.poison?`<h3>${w(l,'poison')}</h3>${priv.targets.map(id=>targetButton(id,name(id),'poison')).join('')}`:`<p>${w(l,'poisoned')}</p>`}`;
    else actions.innerHTML=`<h3>${w(l,'choose')}</h3>${priv.targets.map(id=>targetButton(id,name(id))).join('')}${g.stage!=='seer'?targetButton(null,w(l,'abstain')):''}${priv.choice?`<p>${w(l,'selected')}: ${esc(name(priv.choice))}</p>`:''}`;
   }else actions.innerHTML=`<p>${w(l,priv.choice?'selected':'wait')}</p>`;
  }
 }
 return {update(s,connected){active=true;state=s;online=connected;const g=s.party.werewolf;const newIdentity=s.party.id+':'+s.language;const next=JSON.stringify([s.phase,online,s.party.replayPending,s.party.players,g&&{...g,seconds:undefined}]);if(identity!==newIdentity||key!==next){identity=newIdentity;key=next;render();}const reconnect=app.querySelector('[data-wolf-reconnecting]');if(reconnect)reconnect.textContent=(s.party.reconnectingPlayers||[]).length?`${w(s.language,s.phase==='paused'?'waitingReconnect':'reconnecting')} : ${(s.party.reconnectingPlayers||[]).map(p=>name(p.id)).join(', ')}`:'';const clock=app.querySelector('[data-wolf-clock]');if(clock)clock.textContent=s.party.replayPending?(s.party.replayRemainingMs===null?w(s.language,'minimum'):`${Math.ceil(s.party.replayRemainingMs/1000)}s`):g?.winner?'':`${g?.seconds||0}s`;},dispose(){hide();active=false;key='';identity='';scene?.remove();scene=null;}};
}
