import {createWerewolfView} from './werewolf-ui.js';
import {kartStickValue,kartCommand} from './kart-controls.js';
import {createMonopolyRenderer} from './monopoly-renderer.js';
import {monopolyMarkup} from './monopoly-ui.js';
import {createKartRenderer} from './kart-renderer.js';
import {kartResults,gamePodium} from './game-transitions.js';
import { g } from './games-i18n.js';
import { locationLabel, t } from './i18n.js';
import { fitArena } from './screen-layout.js';
import {opponentsMarkup,animateUno,turnMarkup} from './uno-motion.js';
import {TankFrames} from './tank-frames.js';
import {createTankRenderer} from './tank-renderer.js';
import {itemIcon} from './item-icons.js';
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time=ms=>{const n=Math.ceil(Math.max(0,ms)/1000);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
const face=value=>({skip:'⊘',reverse:'⇄',draw2:'+2',draw4:'+4',wild:'✦'}[value]||value);
export function cardMarkup(card,language,{button=false,disabled=false}={}) {
  if(!card)return '';
  const label=`${g(language,card.color)} ${/^\d$/.test(card.value)?card.value:g(language,card.value)}`;
  const tag=button?'button':'div';
  return `<${tag} class="uno-card color-${card.color} " ${button?`data-uno-card="${card.id}" ${disabled?'disabled':''}`:''} aria-label="${esc(label)}"><span>${face(card.value)}</span><strong>${face(card.value)}</strong><small>${esc(g(language,card.color))}</small></${tag}>`;
}
export function createGamesView(app,role,{send,notice,audio}) {
  const wolfView=createWerewolfView(app,role,{send,notice});
  let s,online=false,key='',active=false,frame,canvas,wild=null,viewKey='',previousSent='',lastSent=0;
  const kartSticks={steer:0,throttle:0},kartPointers=new Map();
  const held=new Map(),keyboard=new Set(),frames=new TankFrames(),ui=new Map();
  let renderer,monopolyRenderer;
  function write(selector,property,value){if(ui.get(selector)===value)return;const el=app.querySelector(selector);if(el){el[property]=value;ui.set(selector,value);}}
  let stick=null,stickPointer=null,lastAnimation=0,animationMatch='';
  const tr=(name,vars)=>g(s.language,name,{max:s.party.maxPlayers,...vars});
  const name=id=>{const p=s.party.players.find(p=>p.id===id);return p?(p.name||tr('player',{n:p.number})):'';};
  const canControl=()=>active&&online&&role==='controller'&&s?.phase==='playing'&&Boolean(s.party.you);
  const doSend=(action,value)=>send(action,value).catch(error=>{if(action==='unoPlay'&&error.code){audio?.play('negative');}else notice(error.message);});
  const zero=()=>({throttle:0,turn:0,fire:false});
  function input(force=false){
    if(!active||!['tanks','kart'].includes(s?.experience)||role!=='controller')return;
    const values=new Set([...held.values(),...keyboard]);
    let value=canControl()?{throttle:Number(values.has('forward'))-Number(values.has('back')),turn:Number(values.has('right'))-Number(values.has('left')),fire:values.has('fire')}:zero();
    if(stick&&canControl()){value.x=stick.x;value.y=stick.y;delete value.throttle;delete value.turn;}
    if(s.experience==='kart')value=kartCommand(kartSticks,values,canControl());
    const text=JSON.stringify(value),now=Date.now();
    if(!force&&text===previousSent&&!value.fire&&!value.brake&&!(value.steer||value.throttle||value.turn||value.x||value.y))return;
    if(canControl()&&(force||(text!==previousSent&&now-lastSent>=50)||now-lastSent>=100)){previousSent=text;lastSent=now;doSend(s.experience==='kart'?'kartInput':'tankInput',value);}
  }
  const stop=()=>{kartSticks.steer=0;kartSticks.throttle=0;kartPointers.clear();for(const knob of app.querySelectorAll('.kart-stick .joystick-knob'))knob.style.transform='translate(-50%,-50%)';held.clear();keyboard.clear();stick=null;stickPointer=null;const knob=app.querySelector('.joystick-knob');if(knob)knob.style.transform='translate(-50%,-50%)';input(true);};
  const interval=setInterval(()=>input(),100);
  function fitDisplay() {
    if (!active || role !== 'display') return;
    const shell = app.querySelector('.game-shell');
    if (!shell) return;
    shell.style.height = `${window.innerHeight}px`;
    if (canvas) {
      const stage = app.querySelector('.game-stage');
      const size = fitArena(stage.clientWidth, stage.clientHeight);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
    }
  }
  window.addEventListener('resize', fitDisplay);
  for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(event, fitDisplay);
  function mount(){
    monopolyRenderer?.dispose();monopolyRenderer=null;
    const p=s.party,place=locationLabel(s.language,s.room,s.station);
    app.innerHTML=`<div class="game-shell ${role==='controller'?'game-phone':'game-display'}" data-game="${s.experience}"><header class="game-header"><div><span class="game-brand">RETRO_MUSEUM · MULTI</span><h1>${tr(s.experience)}</h1></div><button class="button ghost" data-fullscreen>${t(s.language,'fullscreen')}</button></header><div class="game-scoreboard"></div><div class="game-message" role="status"></div>${role==='controller'?'<div class="game-replay"></div>':''}<main class="game-stage"></main><div class="uno-motion-layer" aria-hidden="true"></div><footer class="game-footer"><span>${place}</span><span data-game-time></span></footer></div>`;
    key='';canvas=null;wild=null;ui.clear();frames.reset();renderer=null;cancelAnimationFrame(frame);frame=undefined;
    if(role==='display'&&['tanks','kart'].includes(s.experience)){
      app.querySelector('.game-stage').innerHTML='<canvas class="tank-arena" width="960" height="640" aria-label="Tank arena"></canvas><div class="game-overlay"></div>';
      canvas=app.querySelector('canvas');renderer=s.experience==='kart'?createKartRenderer(canvas):createTankRenderer(canvas);
    }
  }
  function roster(){
    return s.party.players.map(p=>`<div class="game-player player-${p.number} ${s.party.you===p.id?'is-you':''} ${(s.party.uno?.turn||s.party.monopoly?.auction?.turn||s.party.monopoly?.turn)===p.id?'has-turn':''}">${p.avatar?`<img class="player-avatar" src="${esc(p.avatar)}" alt="">`:`<span class="player-number">${p.number}</span>`}<strong>${esc(p.name||tr('player',{n:p.number}))}${s.party.you===p.id?` · ${tr('you')}`:''}</strong><span>${s.party.kart?`#${s.party.kart.order.findIndex(x=>x.id===p.id)+1} · ${Math.min(s.party.kart.laps,(s.party.kart.order.find(x=>x.id===p.id)?.lap||0)+1)}/${s.party.kart.laps} · ${s.party.kart.standings.find(x=>x.id===p.id)?.points||0} ${tr('points')}`:s.party.tanks?`${s.party.tanks.scores.find(x=>x.id===p.id)?.score||0} / 5`:s.party.uno?tr('cards',{n:s.party.uno.counts.find(x=>x.id===p.id)?.count||0}):tr(p.connected?'connected':'offline')}</span>${!p.connected&&(s.party.tanks||s.party.uno||s.party.kart)?`<small>${tr('offline')}</small>`:''}</div>`).join('');
  }
  function lobby(){
    return `<section class="party-lobby"><p class="eyebrow">${tr('players',{n:s.party.players.length})}</p><h2>${tr('lobby')}</h2><p>${tr('lobbyHelp')}</p><p class="game-rules">${tr(s.experience==='monopoly'?'monoRules':s.experience==='kart'?'kartRules':s.experience==='tanks'?'tanksRules':'unoRules')}</p><p>${tr('waiting')}</p>${s.experience==='uno'?`<small>${tr('wildRule')}</small>`:''}</section>`;
  }
  function renderContent(){
    for(const selector of ['.tank-fire','.tank-life','.game-overlay'])ui.delete(selector);
    const p=s.party,stage=app.querySelector('.game-stage');
    if(s.phase==='ready'){
      if(canvas)app.querySelector('.game-overlay').innerHTML=lobby();else stage.innerHTML=lobby();return;
    }
    if(s.experience==='monopoly'){
      const html=monopolyMarkup(s,role,canControl());
      if(role==='display'&&s.party.monopoly&&!['solved','ended'].includes(s.phase)){
        if(!stage.querySelector('.mono-visual')){stage.innerHTML=html;monopolyRenderer=createMonopolyRenderer(stage.querySelector('.mono-visual'),s.language);}
        else {const temp=document.createElement('div');temp.innerHTML=html;stage.querySelector('.mono-summary').innerHTML=temp.querySelector('.mono-summary').innerHTML;if(!monopolyRenderer)stage.querySelector('.mono-visual').innerHTML=temp.querySelector('.mono-visual').innerHTML;}
        monopolyRenderer?.update(s.party.monopoly,s.party.players);
      }else {monopolyRenderer?.dispose();monopolyRenderer=null;stage.innerHTML=html;}
      return;
    }
    if(s.phase==='solved'&&s.experience==='uno'){stage.innerHTML=gamePodium(s);return;}
    if(role==='controller'&&s.experience==='kart'){
      stage.innerHTML=`<section class="tank-controller"><p class="tank-phone-help">${tr('kartDualHelp')}</p><div class="kart-dual"><div><strong>${tr('kartSteer')}</strong><div class="kart-stick" data-kart-stick="steer" role="group" aria-label="${tr('kartSteer')}"><span class="stick-guide">◀　▶</span><span class="joystick-knob"></span></div></div><div><strong>${tr('kartPedal')}</strong><div class="kart-stick" data-kart-stick="throttle" role="group" aria-label="${tr('kartPedal')}"><span class="stick-guide">▲<br><br>▼</span><span class="joystick-knob"></span></div></div></div><p class="tank-life" role="status"></p></section>`;
    } else if(role==='controller'&&s.experience==='tanks'){

      stage.innerHTML=`<section class="tank-controller"><p class="tank-phone-help">${tr(s.experience==='kart'?'kartJoystick':'joystick')}</p><div class="tank-joystick-pad"><div class="tank-joystick" role="group" aria-label="${tr('joystick')}"><span class="joystick-knob"></span></div><button data-tank="fire" class="tank-fire">◎<span>${tr(s.experience==='kart'?'brake':'fire')}</span></button></div><p class="tank-phone-help">${tr(s.experience==='monopoly'?'monoRules':s.experience==='kart'?'kartRules':'itemHelp')}</p><p class="tank-life" role="status"></p></section>`;
    } else if(s.experience==='uno') {
      const uno=p.uno;
      stage.innerHTML=`${role==='display'?opponentsMarkup(p,s.language,g):''}<div class="uno-table"><div class="uno-deck" aria-hidden="true">✦</div>${cardMarkup(uno?.top,s.language)}<div class="current-color color-${uno?.color||'red'}">${tr(uno?.color||'red')}</div></div>
        ${role==='controller'&&uno?.hand?`<section class="uno-hand"><div class="uno-hand-heading"><h2>${tr('hand',{n:uno.hand.length})}</h2><button class="button uno-call" data-game-action="unoCall" ${!canControl()||!(uno.hand.length===1||(uno.turn===p.you&&uno.hand.length===2))?'disabled':''}>${tr(uno.declared?'unoReady':'callUno')}</button></div><div class="uno-cards">${uno.hand.map(card=>cardMarkup(card,s.language,{button:true,disabled:!canControl()})).join('')}</div><div class="uno-actions"><button class="button primary" data-game-action="unoDraw" ${!canControl()||!uno.canDraw?'disabled':''}>${tr('draw')}</button><button class="button" data-game-action="unoPass" ${!canControl()||!uno.canPass?'disabled':''}>${tr('pass')}</button>${uno.vulnerable&&uno.vulnerable!==p.you?`<button class="button catch-uno" data-uno-catch="${uno.vulnerable}" ${!canControl()?'disabled':''}>${esc(tr('catchUno',{player:name(uno.vulnerable)}))}</button>`:''}</div></section>`:''}
        <details class="game-rules-details"><summary>${t(s.language,'beforeStart')}</summary><p>${tr('unoRules')}</p><p>${tr('wildRule')}</p></details><div class="uno-color-picker"></div>`;
    }
  }
  function status(){
    if(!online)return t(s.language,'disconnected');
    if(s.phase==='ready')return '';
    if(s.phase==='intro')return `${Math.max(1,Math.ceil(s.introRemainingMs/1000))}…`;
    if(['paused','ended'].includes(s.phase))return tr(s.party.reason||'adminPause');
    const winner=s.party.monopoly?.winner||s.party.kart?.winner||s.party.tanks?.winner||s.party.uno?.winner;
    if(winner)return `${tr('winner',{player:name(winner)})} ${tr('gameWon')}`;
    if(s.experience==='kart')return `${tr('circuit',{n:s.party.kart?.circuit||1})} · ${tr(s.party.kart?.track||'coast')} · ${s.party.kart?.laps||3} ${tr('laps')}`;
    if(s.experience==='monopoly')return s.party.you===(s.party.monopoly?.auction?.turn||s.party.monopoly?.turn)?tr('yourTurn'):tr('turn',{player:name(s.party.monopoly?.auction?.turn||s.party.monopoly?.turn)});
    if(s.experience==='uno')return s.party.you===s.party.uno?.turn?tr('yourTurn'):tr('turn',{player:name(s.party.uno?.turn)});
    return tr('round',{n:s.party.tanks?.round||1})+' · '+tr(['regionDesert','regionCoast','regionForest','regionAlpine','regionVolcano'][((s.party.tanks?.round||1)-1)%5]);
  }
  function drawArena(at){
    frame=undefined;
    if(!active||!canvas||!renderer)return;
    renderer.draw(frames.sample(at)||s.party.kart||s.party.tanks,s.party.players);
    if(online&&s.phase==='playing'&&!document.hidden)frame=requestAnimationFrame(drawArena);
  }
  function requestArena(){if(canvas&&frame===undefined)frame=requestAnimationFrame(drawArena);}
  function update(state,connected){
    if(state.experience==='werewolf'){if(active){stop();active=false;monopolyRenderer?.dispose();monopolyRenderer=null;cancelAnimationFrame(frame);viewKey='';}wolfView.update(state,connected);return;}wolfView.dispose();
    const wasPlaying=canControl();s=state;online=connected;active=true;
    const identity=`${s.party.id}:${s.language}:${s.room}:${s.station}`;
    if(viewKey!==identity){stop();viewKey=identity;mount();}
    if(wasPlaying&&!canControl())stop();
    write('.game-scoreboard','innerHTML',roster());
    if(s.experience==='uno'&&role==='display'&&s.phase==='playing')write('.game-message','innerHTML',turnMarkup(s.party,s.language));
    else write('.game-message','textContent',status());
    if(role==='controller')write('.game-replay','innerHTML',['solved','ended'].includes(s.phase)?`<button class="button primary" data-action="playAgain" ${!online||s.party.players.filter(p=>p.connected).length<2?'disabled':''}>${tr('playAgain')}</button>${s.party.players.filter(p=>p.connected).length<2?`<p>${tr('needPlayers')}</p>`:''}`:'');
    write('[data-game-time]','textContent',time(s.remainingMs));
    write('[data-party-capacity]','textContent',tr(s.party.canJoin?'players':'fullLobby',{n:s.party.players.length}));
    const contentKey=JSON.stringify({phase:s.phase,online,players:['uno','monopoly'].includes(s.experience)||s.phase==='ready'?s.party.players:undefined,uno:s.party.uno,monopoly:s.party.monopoly,game:s.experience});
    // Keep held touch controls mounted during physics updates.
    if(key!==contentKey){key=contentKey;renderContent();fitDisplay();}
    if(s.experience==='uno'&&role==='display'){
      const events=s.party.uno?.animations||[];
      if(animationMatch!==s.party.id){animationMatch=s.party.id;lastAnimation=events.at(-1)?.id||0;}
      else for(const event of events)if(event.id>lastAnimation){animateUno(app,event,card=>cardMarkup(card,s.language));lastAnimation=event.id;}
    }
    if(s.experience==='kart'){
      const game=s.party.kart,own=game?.karts.find(k=>k.id===s.party.you);
      write('.tank-life','textContent',own?`${tr(own.finished?'raceFinished':'lap',{n:Math.min(game.laps,own.lap+1),total:game.laps})} · ${Math.round(own.speed)} ${tr('speed')}`:'');
      for(const b of app.querySelectorAll('[data-tank]'))b.disabled=!canControl()||!own||own.finished||game.stage!=='racing';
      if(canvas){if(s.phase!=='ready'){const result=game?.stage==='results'||game?.winner;write('.game-overlay','innerHTML',result?kartResults(game,s.party.players,s.language):['intro','paused','ended'].includes(s.phase)||!online?`<div class="game-announcement">${esc(status())}</div>`:game?.stage==='countdown'?`<div class="game-announcement">${Math.max(1,Math.ceil(game.stageRemainingMs/1000))}</div>`:'');}
      if(game)frames.push({...game,tanks:game.karts,bullets:[]},s.party.id+':'+game.circuit+':'+game.stage+':'+s.phase,performance.now());requestArena();}
    }
    if(s.experience==='tanks'){
      const item=s.party.tanks?.tanks.find(t=>t.id===s.party.you)?.item,button=app.querySelector('.tank-fire');
      if(button){button.classList.toggle('has-item',Boolean(item));write('.tank-fire','innerHTML',item?`${itemIcon(item)}<span>${tr(item)}</span>`:`◎<span>${tr('fire')}</span>`);}
      for(const button of app.querySelectorAll('[data-tank]'))button.disabled=!canControl()||!s.party.tanks?.tanks.find(t=>t.id===s.party.you)?.alive;
      write('.tank-life','textContent',s.party.tanks?.tanks.find(t=>t.id===s.party.you)?.alive?'':tr('knockedOut'));
      if(canvas){
        const overlay=app.querySelector('.game-overlay');
        if(s.phase!=='ready'){
          const round=s.party.tanks?.intermissionMs>0;
          const announcement=['intro','paused','solved','ended'].includes(s.phase)||!online?`<div class="game-announcement">${esc(status())}</div>`:round?`<div class="game-announcement">${esc(tr(s.party.tanks.roundWinner?'roundWon':'roundDraw',{player:name(s.party.tanks.roundWinner)}))}<small>${tr('nextRound')}</small></div>`:'';
          write('.game-overlay','innerHTML',s.phase==='solved'?gamePodium(s):announcement);
        }
        frames.push(s.party.tanks,s.party.id+':'+s.party.tanks?.round+':'+s.party.tanks?.layoutRevision+':'+s.phase,performance.now());
        requestArena();
      }
    }
    if(wild){const card=s.party.uno?.hand?.find(c=>c.id===wild);if(!card||!canControl())wild=null;else showColors();}
  }
  function showColors(){const el=app.querySelector('.uno-color-picker');if(el)el.innerHTML=wild?`<div class="color-dialog" role="dialog" aria-modal="true" aria-label="${tr('chooseColor')}"><h2>${tr('chooseColor')}</h2><div>${['red','yellow','green','blue'].map(color=>`<button class="color-${color}" data-uno-color="${color}">${tr(color)}</button>`).join('')}</div><button class="button ghost" data-uno-cancel>${tr('cancel')}</button></div>`:'';}
  function kartMove(event){const axis=kartPointers.get(event.pointerId);if(!axis)return;const ring=app.querySelector('[data-kart-stick="'+axis+'"]');if(!ring)return;const {value,offset}=kartStickValue(axis,event.clientX,event.clientY,ring.getBoundingClientRect());kartSticks[axis]=value;ring.querySelector('.joystick-knob').style.transform='translate(calc(-50% + '+(axis==='steer'?offset:0)+'px),calc(-50% + '+(axis==='throttle'?-offset:0)+'px))';input();}
  app.addEventListener('pointerdown',event=>{const ring=event.target.closest('[data-kart-stick]');if(!ring||!canControl())return;event.preventDefault();const axis=ring.dataset.kartStick;if([...kartPointers.values()].includes(axis))return;kartPointers.set(event.pointerId,axis);ring.setPointerCapture(event.pointerId);kartMove(event);});
  app.addEventListener('pointermove',event=>{if(kartPointers.has(event.pointerId)){event.preventDefault();kartMove(event);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])app.addEventListener(type,event=>{const axis=kartPointers.get(event.pointerId);if(!axis)return;kartPointers.delete(event.pointerId);kartSticks[axis]=0;const knob=app.querySelector('[data-kart-stick="'+axis+'"] .joystick-knob');if(knob)knob.style.transform='translate(-50%,-50%)';input(true);});
  function moveStick(event){const ring=app.querySelector('.tank-joystick');if(!ring)return;const r=ring.getBoundingClientRect(),radius=r.width/2-24,dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2,len=Math.max(radius,Math.hypot(dx,dy));stick={x:dx/len,y:dy/len};ring.querySelector('.joystick-knob').style.transform=`translate(calc(-50% + ${stick.x*radius}px),calc(-50% + ${stick.y*radius}px))`;input();}
  app.addEventListener('pointerdown',event=>{const ring=event.target.closest('.tank-joystick');if(!ring||!canControl())return;event.preventDefault();stickPointer=event.pointerId;ring.setPointerCapture(event.pointerId);moveStick(event);});
  app.addEventListener('pointermove',event=>{if(event.pointerId===stickPointer){event.preventDefault();moveStick(event);}});
  const releaseStick=event=>{if(event.pointerId!==stickPointer)return;stickPointer=null;stick=null;const knob=app.querySelector('.joystick-knob');if(knob)knob.style.transform='translate(-50%,-50%)';input(true);};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])app.addEventListener(event,releaseStick);
  app.addEventListener('pointerdown',event=>{const b=event.target.closest('[data-tank]');if(!b||b.disabled)return;event.preventDefault();b.setPointerCapture(event.pointerId);held.set(event.pointerId,b.dataset.tank);b.classList.add('held');input(true);});
  const release=event=>{if(!held.has(event.pointerId))return;held.delete(event.pointerId);event.target.closest('[data-tank]')?.classList.remove('held');input(true);};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])app.addEventListener(event,release);
  app.addEventListener('click',event=>{
    if(!active)return;const b=event.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.monoAction){
      const action=b.dataset.monoAction;
      if(action==='monoBankrupt'&&!window.confirm(tr('monoConfirm')))return;
      const value=action==='monoOffer'?{tile:Number(app.querySelector('[data-mono-deed]').value),to:app.querySelector('[data-mono-buyer]').value,price:Number(app.querySelector('[data-mono-price]').value)}:b.dataset.monoTile!==undefined?{tile:Number(b.dataset.monoTile)}:undefined;
      doSend(action,value);
    }
    if(b.dataset.gameAction)doSend(b.dataset.gameAction);
    if(b.dataset.unoCatch)doSend('unoCatch',{target:b.dataset.unoCatch});
    if(b.dataset.unoCard){const card=s.party.uno.hand.find(c=>c.id===b.dataset.unoCard);if(card?.color==='wild'){wild=card.id;showColors();}else doSend('unoPlay',{cardId:card.id});}
    if(b.dataset.unoColor&&wild){const cardId=wild;wild=null;showColors();doSend('unoPlay',{cardId,color:b.dataset.unoColor});}
    if(b.hasAttribute('data-uno-cancel')){wild=null;showColors();}
  });
  const keys={ArrowUp:'forward',KeyW:'forward',KeyZ:'forward',ArrowDown:'back',KeyS:'back',ArrowLeft:'left',KeyA:'left',KeyQ:'left',ArrowRight:'right',KeyD:'right',Space:'fire'};
  window.addEventListener('keydown',event=>{if(event.target.closest('input,select,textarea,[role=dialog]')||!canControl()||!['tanks','kart'].includes(s.experience)||event.ctrlKey||event.altKey||event.metaKey||!keys[event.code])return;event.preventDefault();keyboard.add(keys[event.code]);if(!event.repeat)input(true);});
  window.addEventListener('keyup',event=>{if(keys[event.code]){keyboard.delete(keys[event.code]);input(true);}});
  window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.addEventListener('museum-settings-open',stop);
  window.addEventListener('pagehide',()=>{stop();clearInterval(interval);cancelAnimationFrame(frame);});
  return {update,dispose(){wolfView.dispose();monopolyRenderer?.dispose();monopolyRenderer=null;stop();active=false;viewKey='';canvas=null;renderer=null;frames.reset();cancelAnimationFrame(frame);frame=undefined;}};
}
