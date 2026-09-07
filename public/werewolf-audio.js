import {wolfCue} from './werewolf-text.js';
export function createWolfNarrator(){
 const buffers=new Map();let source=null,identity='',generation=0,lastState,ctx,enabled=false;
 function stop(){generation++;if(source){try{source.stop();source.disconnect();}catch{}source=null;}}
 async function update(context,state,on){
  lastState=state;ctx=context;enabled=on;
  const cue=wolfCue(state),game=state?.party?.werewolf;
  if(!on||!context||context.state!=='running'||!cue||document.hidden){stop();identity='';return;}
  const language=['en','fr','tl'].includes(state.language)?state.language:'en',phase=['intro','playing'].includes(state.phase)?'active':state.phase,id=`${state.party.id}:${game.sequence}:${phase}:${language}:${cue}`;
  if(id===identity)return;stop();identity=id;const current=generation;
  const url=`assets/narration/${language}/${cue}.mp3`;
  try{
   if(!buffers.has(url))buffers.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error('Narration unavailable');return r.arrayBuffer();}).then(bytes=>new Promise((resolve,reject)=>context.decodeAudioData(bytes,resolve,reject))).catch(error=>{buffers.delete(url);throw error;}));
   const buffer=await buffers.get(url);if(current!==generation||!enabled||document.hidden)return;
   source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();
  }catch{if(current===generation)identity='';}
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();identity='';}else update(ctx,lastState,enabled);});
 return {update,stop(){stop();identity='';lastState=null;enabled=false;}};
}
