import {createGamesView} from '../public/games-ui.js';
import {createGameAudio} from '../public/game-audio.js';
import {createGameTransitions} from '../public/game-transitions.js';
import {toggleFullscreen} from '../public/screen-layout.js';
const app=document.querySelector('#app'),sound=document.querySelector('#sound'),music=document.querySelector('#music');let role,view,audio,transitions,state;const pending=new Map();let sequence=0;
const tell=(type,value={})=>parent.postMessage({retroMuseum:1,type,...value},'*');
const notice=text=>{const el=document.querySelector('#notice');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500);};
const send=(action,value)=>new Promise((resolve,reject)=>{const id=String(++sequence);const timeout=setTimeout(()=>{pending.delete(id);reject(Error('Connection interrupted'));},7000);pending.set(id,{resolve,reject,timeout});tell('action',{id,action,value});});
sound.onclick=()=>audio?.test();music.onclick=()=>audio?.toggleMusic();
addEventListener('message',event=>{if(event.source!==parent||event.data?.retroMuseum!==1)return;const m=event.data;
 if(m.type==='ack'||m.type==='error'){const wait=pending.get(m.id);if(wait){clearTimeout(wait.timeout);pending.delete(m.id);m.type==='ack'?wait.resolve():wait.reject(Object.assign(Error(m.message),{code:m.code}));}return;}
 if(m.type!=='state')return;role=m.role;state={...m.state,experience:'kart',party:{...m.state.party,game:'kart',kart:m.state.party.community}};
 if(!view){audio=createGameAudio(role);transitions=createGameTransitions(role);view=createGamesView(app,role,{send,notice,audio});audio.subscribe(s=>{sound.textContent=s.ready?'♪':'♪ '+({fr:'Activer le son',tl:'Paganahin ang tunog'}[state.language]||'Enable sound');music.textContent=s.musicMuted?'♫ ×':'♫';});}
 music.hidden=role!=='display';view.update(state,m.online);audio.observe(state);transitions.observe(state);
});
app.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.disabled)return;if(button.hasAttribute('data-fullscreen')){toggleFullscreen(document);return;}if(button.dataset.action)send(button.dataset.action).catch(e=>notice(e.message));});
tell('ready');
