import {w} from './werewolf-text.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function coveredActionsMarkup(game,language,name,enabled){
 const p=game?.private;
 if(game?.nightMode!=='openEyes'||!p?.alive||!['wolves','seer','witch'].includes(game.stage))return null;
 const button=(target,label,potion)=>`<button class="button ${p.choice===target&&target?'active':''}" data-wolf-target="${esc(target||'')}" ${potion?`data-potion="${potion}"`:''} ${!enabled?'disabled':''}>${esc(label)}</button>`;
 return `<p>${w(language,'coverHelp')}</p>${game.stage==='witch'?`<div>${button(null,w(language,'protect'),'heal')}${button(null,w(language,'pass'),'pass')}</div><h3>${w(language,'designate')}</h3>`:`<h3>${w(language,'choose')}</h3>`}${p.targets.map(id=>button(id,name(id),game.stage==='witch'?'poison':null)).join('')}${game.stage!=='witch'?button(null,w(language,'abstain')):''}${p.cover&&Object.keys(p.cover).length?`<p>${w(language,'coverRecorded')}${p.choice?`: ${esc(name(p.choice))}`:''}</p>`:''}`;
}
export function coveredSecretMarkup(game,language,name){
 if(game?.nightMode!=='openEyes'||!game.private)return '';
 const p=game.private;
 let html=`${!['wolf','witch'].includes(p.role)?`<p>${w(language,p.role+'Help')}</p>`:''}<p>${w(language,'coverSecret')}</p>`;
 if(p.role==='wolf'){
  html+=`<p>${w(language,'coverWolfHelp')}</p>`;
  if(p.packChoices)html+=`<p><b>${w(language,'packChoices')}</b><br>${p.packChoices.map(v=>`${esc(name(v.id))} → ${esc(v.target?name(v.target):w(language,'noChoice'))}`).join('<br>')}</p>`;
 }
 if(p.role==='witch')html+=`<p>${w(language,'coverWitchHelp')}</p><p>${w(language,'heal')}: ${w(language,p.potions.heal?'available':'used')}<br>${w(language,'poison')}: ${w(language,p.potions.poison?'available':'used')}</p>${game.stage==='witch'?`<p>${w(language,'victim')}: <b>${esc(p.victim?name(p.victim):w(language,'none'))}</b>${p.healed?`<br>${w(language,'saved')}`:''}${p.poisoned?`<br>${w(language,'poisoned')}: ${esc(name(p.poisoned))}`:''}</p>`:''}`;
 return html;
}
