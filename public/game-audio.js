import {gameStorage as localStorage} from "./game-storage.js";
import {createBackgroundMusic} from './background-music.js';
// Only event counters cross the network. Audio is synthesized locally.
import {createWolfNarrator} from './werewolf-audio.js';
export function audioEvents(previous,state,role){
  const p=state.party,old=previous?.party,out=[];
  if(role==='admin'||!p||old?.id!==p.id)return out;
  if(p.werewolf&&old.werewolf){
    const game=p.werewolf,prior=old.werewolf;
    if(role==='display'&&game.sequence!==prior.sequence){
      if(game.winner)out.push(game.winner==='wolves'?'wolfDarkVictory':'wolfVictory');
      else if(game.stage==='night')out.push('wolfNight');
      else if(game.stage==='dawn')out.push('wolfDawn');
      else if(game.stage==='vote'||game.stage==='verdict')out.push('wolfVote');
    }
    if(role==='controller'&&game.winner&&!prior.winner&&game.winners.includes(p.you))out.push('win');
  }
  if(state.phase!==previous.phase){
    if(state.phase==='intro')out.push('start');
    if(state.phase==='paused')out.push('pause');
    if(state.phase==='playing'&&previous.phase==='paused')out.push('resume');
    if(['solved','ended'].includes(state.phase))out.push('end');
  }
  const winner=p.monopoly?.winner||p.kart?.winner||p.tanks?.winner||p.uno?.winner,oldWinner=old.monopoly?.winner||old.kart?.winner||old.tanks?.winner||old.uno?.winner;
  if(role==='controller'&&winner===p.you&&winner!==oldWinner)out.push('win');
  if(p.tanks&&old.tanks&&p.tanks.round===old.tanks.round){
    for(const tank of p.tanks.tanks){
      if(role==='controller'&&tank.id!==p.you)continue;
      const before=old.tanks.tanks.find(t=>t.id===tank.id);if(!before)continue;
      for(let n=0;n<Math.min(3,Math.max(0,(tank.shots||0)-(before.shots||0)));n++)out.push('shot');
      if(role==='controller'&&before.alive&&!tank.alive)out.push('death');
    }
  }
  if(p.uno&&old.uno){
    const last=old.uno.animations?.at(-1)?.id||0;
    for(const event of p.uno.animations||[])if(event.id>last&&(role==='display'||event.player===p.you))out.push(event.type==='play'?'card':'draw');
  }
  if(p.kart&&old.kart){
    const last=old.kart.events?.at(-1)?.id||0;
    for(const event of p.kart.events||[])if(event.id>last&&(role==='display'||event.player===p.you||event.type==='go')){
      if(event.type==='lap')out.push('card');if(event.type==='finish'||event.type==='results')out.push('start');if(event.type==='go'||event.type==='boost')out.push('resume');if(event.type==='oil')out.push('negative');
    }
  }
  if(p.monopoly&&old.monopoly){const last=old.monopoly.events?.at(-1)?.id||0;for(const event of p.monopoly.events||[])if(event.id>last&&(role==='display'||event.player===p.you))out.push(event.type==='roll'?'draw':event.type==='bankrupt'?'death':'card');}
  return out;
}
const tunes={start:[392,523,659,784],pause:[440,330,220],resume:[330,440,660],end:[523,440,349,262],win:[523,659,784,1047,784,1047],card:[620,830],draw:[330,440],negative:[160,120],death:[220,165,82],shot:[190,65]};
Object.assign(tunes,{wolfNight:[392,330,294,220,196,147],wolfDawn:[262,330,392,523,659],wolfVote:[220,220,294,220],wolfVictory:[349,440,523,698,880,1047],wolfDarkVictory:[220,262,330,440,523,660]});
export function createGameAudio(role){
  const storageKey=`museum-sound-muted-${role}`;
  let context,previous,muted=localStorage.getItem(storageKey)==='1',error=false;
  const narrator=createWolfNarrator();
  const music=createBackgroundMusic();let musicMuted=localStorage.getItem('museum-music-muted-display')==='1';
  const syncMusic=()=>{music.update(context,previous,role==='display'&&!muted&&!musicMuted);if(role==='display')narrator.update(context,previous,!muted);};
  const listeners=[];
  const notify=()=>{syncMusic();listeners.forEach(fn=>fn({muted,musicMuted,ready:context?.state==='running',supported:Boolean(window.AudioContext||window.webkitAudioContext),error}));};
  async function unlock(){
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){notify();return false;}
      if(!context||context.state==='closed'){context=new Audio();context.onstatechange=notify;}
      error=false;notify();
      if(context.state!=='running')await context.resume();notify();return context.state==='running';
    }catch{error=true;notify();return false;}
  }
  function play(name){
    if(muted||context?.state!=='running'||role==='admin')return;
    const notes=tunes[name]||[],step=name.startsWith('wolf')?.3:name==='shot'?.035:name==='card'||name==='draw'?.06:.13;
    notes.forEach((frequency,i)=>{
      const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime+i*step;
      oscillator.type=name==='shot'||name==='death'?'sawtooth':'triangle';oscillator.frequency.setValueAtTime(frequency,at);
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.075,at+.008);gain.gain.exponentialRampToValueAtTime(.001,at+step*.95);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+step);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    });
  }
  // Every new page needs a real gesture; failed autoplay never blocks the game.
  const gesture=()=>{if(context?.state!=='running')unlock();};
  document.addEventListener('pointerdown',gesture,{passive:true});document.addEventListener('click',gesture);document.addEventListener('touchend',gesture,{passive:true});document.addEventListener('keydown',gesture);
  const setMuted=value=>{muted=value;localStorage.setItem(storageKey,muted?'1':'0');notify();};
  document.addEventListener('visibilitychange',syncMusic);window.addEventListener?.('pagehide',()=>{music.stop();narrator.stop();});
  return {toggleMusic(){musicMuted=!musicMuted;localStorage.setItem('museum-music-muted-display',musicMuted?'1':'0');if(!musicMuted)unlock();notify();},play,unlock,async test(){setMuted(false);if(await unlock())play('start');},observe(state){for(const cue of audioEvents(previous,state,role))play(cue);previous=state;syncMusic();},reset(){previous=null;music.stop();narrator.stop();},subscribe(fn){listeners.push(fn);notify();},toggle(){setMuted(!muted);if(!muted)unlock().then(ready=>{if(ready)play('card');});},get muted(){return muted;}};
}
