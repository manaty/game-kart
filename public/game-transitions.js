import {g} from './games-i18n.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function transitionCue(previous,state){
  const id=state.party?.id||state.sessionId,oldId=previous?.party?.id||previous?.sessionId;
  if(!previous||id!==oldId)return {key:'welcome',text:state.experience};
  if(state.phase==='intro'){
    const count=Math.ceil(state.introRemainingMs/1000);
    if(count<=3&&(previous.phase!=='intro'||Math.ceil(previous.introRemainingMs/1000)!==count))return {key:'count',text:String(Math.max(1,count))};
  }
  if(state.phase!==previous.phase){
    if(state.phase==='playing')return {key:'go',text:previous.phase==='paused'?'resume':'go'};
    if(state.phase==='paused')return {key:'pause',text:'adminPause'};
    if(state.phase==='solved')return {key:'win',text:'celebrate'};
    if(state.phase==='ended')return {key:'end',text:'finished'};
  }
  const game=state.party?.kart,old=previous.party?.kart;
  if(game&&old){
    if(game.circuit!==old.circuit)return {key:'welcome',text:game.track};
    if(game.stage==='countdown'&&Math.ceil(game.stageRemainingMs/1000)!==Math.ceil(old.stageRemainingMs/1000))return {key:'count',text:String(Math.max(1,Math.ceil(game.stageRemainingMs/1000)))};
    if(game.stage==='racing'&&old.stage==='countdown')return {key:'go',text:'go'};
    if(game.stage==='results'&&old.stage!=='results')return {key:'win',text:'circuitComplete'};
  }
  if(state.party?.tanks?.round!==previous.party?.tanks?.round&&state.party?.tanks&&previous.party?.tanks)return {key:'go',text:'nextRound'};
  return null;
}
export function createGameTransitions(role){
  let previous,timer,layer;
  return {observe(state){
    if(role==='admin')return;
    const cue=transitionCue(previous,state);previous=state;if(!cue)return;
    if(!layer){layer=document.createElement('div');layer.className='game-splash';layer.setAttribute('aria-live','polite');document.body.append(layer);}
    clearTimeout(timer);layer.className='game-splash splash-'+cue.key;
    const players=state.party?.players||[],winner=state.party?.monopoly?.winner||state.party?.kart?.winner||state.party?.tanks?.winner||state.party?.uno?.winner;
    const player=players.find(p=>p.id===winner),title=cue.key==='win'&&player?g(state.language,'winner',{player:player.name||g(state.language,'player',{n:player.number})}):g(state.language,cue.text);
    layer.innerHTML=`<div class="splash-card"><span>${cue.key==='win'?'🏆':cue.key==='count'?'● ● ●':'RETRO MUSEUM'}</span><strong>${esc(title)}</strong>${cue.key==='win'?'<div class="victory-rays" aria-hidden="true"></div>':''}</div>`;
    // Fresh nodes restart the animation; no forced layout or rapid strobing.
    timer=setTimeout(()=>{layer.innerHTML='';layer.className='game-splash';},cue.key==='win'?3000:cue.key==='welcome'?1300:750);
  }};
}
export function kartResults(game,players,language){
  const rows=game.winner?game.standings:game.results;
  return `<section class="race-results"><span class="eyebrow">${g(language,game.winner?'grandPrix':'circuitComplete')}</span><h2>${g(language,game.winner?'finalStandings':'raceStandings')}</h2><ol>${rows.map((r,i)=>{const p=players.find(p=>p.id===r.id);return `<li><b>${i+1}</b>${p?.avatar?`<img class="player-avatar" src="${esc(p.avatar)}" alt="">`:''}<strong>${esc(p?.name||g(language,'player',{n:p?.number||i+1}))}</strong><span>${r.points} ${g(language,'points')}</span></li>`;}).join('')}</ol>${!game.winner?`<p>${g(language,'nextCircuit')}</p>`:''}</section>`;
}
export function gamePodium(state){
  const p=state.party,winner=p.tanks?.winner||p.uno?.winner;
  const rows=[...p.players].sort((a,b)=>a.id===winner?-1:b.id===winner?1:p.tanks?(p.tanks.scores.find(r=>r.id===b.id)?.score||0)-(p.tanks.scores.find(r=>r.id===a.id)?.score||0):(p.uno.counts.find(r=>r.id===a.id)?.count||0)-(p.uno.counts.find(r=>r.id===b.id)?.count||0));
  return `<section class="race-results"><h2>🏆 ${g(state.language,'celebrate')}</h2><ol>${rows.map((player,i)=>`<li><b>${i+1}</b>${player.avatar?`<img class="player-avatar" src="${esc(player.avatar)}" alt="">`:''}<strong>${esc(player.name||g(state.language,'player',{n:player.number}))}</strong><span>${p.tanks?`${p.tanks.scores.find(r=>r.id===player.id)?.score||0} ${g(state.language,'points')}`:g(state.language,'cards',{n:p.uno.counts.find(r=>r.id===player.id)?.count||0})}</span></li>`).join('')}</ol></section>`;
}
