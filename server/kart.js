import {KART_TRACKS,ROAD_RADIUS,trackPosition,trackFeatures} from '../public/kart-tracks.js';
import {TANK_COLORS} from './tanks.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Kart {
  constructor(players,saved,laps=3){
    if(![3,5].includes(laps))throw new Error('invalidLaps');
    this.players=players.map((p,i)=>({id:p.id,color:TANK_COLORS[i],points:0,wins:0}));
    this.laps=laps;this.circuit=0;this.time=0;this.winner=null;this.eventId=0;this.events=[];this.results=[];
    if(saved)Object.assign(this,structuredClone(saved));else this.newCircuit();
    this.controls=new Map();
  }
  record(type,player){this.events.push({id:++this.eventId,type,player});this.events=this.events.slice(-12);}
  newCircuit(){
    this.circuit++;this.stage='racing';this.stageRemaining=0;this.raceTime=0;this.finishGrace=null;this.finishOrder=[];this.results=[];
    this.karts=[];for(const player of this.players)this.addKart(player);this.controls?.clear();
  }
  addKart(player){
    const [a,b]=KART_TRACKS[this.circuit-1].points,angle=Math.atan2(b[1]-a[1],b[0]-a[0]),i=this.karts.length,side=i%2===0?-18:18,front=25+Math.floor(i/2)*30;
    this.karts.push({id:player.id,color:player.color,x:a[0]+Math.cos(angle)*front-Math.sin(angle)*side,y:a[1]+Math.sin(angle)*front+Math.cos(angle)*side,angle,speed:0,lap:0,next:1,checked:0,finished:false,offRoad:false});
  }
  addPlayer(player){const p={id:player.id,color:TANK_COLORS[this.players.length],points:0,wins:0};this.players.push(p);this.addKart(p);}
  input(id,value){
    if(!this.players.some(p=>p.id===id)||!value||!(Number.isFinite(value.steer)&&Math.abs(value.steer)<=1&&Number.isFinite(value.throttle)&&Math.abs(value.throttle)<=1||Number.isFinite(value.x)&&Number.isFinite(value.y)&&Math.hypot(value.x,value.y)<=1.01&&typeof value.brake==='boolean'))throw new Error('invalidControls');
    this.controls.set(id,{...value,at:this.time});
  }
  release(id){if(id)this.controls.delete(id);else this.controls.clear();}
  standings(){return [...this.players].sort((a,b)=>b.points-a.points||b.wins-a.wins||(this.results.findIndex(p=>p.id===a.id)-this.results.findIndex(p=>p.id===b.id))||this.players.indexOf(a)-this.players.indexOf(b));}
  order(){
    const points=KART_TRACKS[this.circuit-1].points;
    return [...this.karts].sort((a,b)=>{
      if(a.finished||b.finished)return a.finished&&b.finished?this.finishOrder.indexOf(a.id)-this.finishOrder.indexOf(b.id):a.finished?-1:1;
      return b.checked-a.checked||Math.hypot(a.x-points[a.next][0],a.y-points[a.next][1])-Math.hypot(b.x-points[b.next][0],b.y-points[b.next][1]);
    });
  }
  checkpoint(kart){
    const points=KART_TRACKS[this.circuit-1].points,target=points[kart.next];
    // Every checkpoint must be reached in order; hovering over the finish line
    // or driving backwards cannot grant extra laps.
    if(Math.hypot(kart.x-target[0],kart.y-target[1])>ROAD_RADIUS+9)return;
    kart.checked++;
    if(kart.next===0){kart.lap++;this.record('lap',kart.id);if(kart.lap>=this.laps){kart.finished=true;kart.speed=0;this.finishOrder.push(kart.id);this.record('finish',kart.id);this.finishGrace??=20;}}
    kart.next=(kart.next+1)%points.length;
  }
  finishCircuit(){
    if(this.stage!=='racing')return;
    this.results=this.order().map((kart,i)=>({id:kart.id,rank:i+1,points:[10,7,5,3,1][i],finished:kart.finished}));
    for(const result of this.results){const p=this.players.find(p=>p.id===result.id);p.points+=result.points;if(result.rank===1)p.wins++;}
    this.release();this.stage='results';this.stageRemaining=7;for(const kart of this.karts)kart.speed=0;
    this.record('results',this.results[0]?.id);
    if(this.circuit===5){this.winner=this.standings()[0].id;this.record('champion',this.winner);}
  }
  step(dt){
    if(this.winner)return;this.time+=dt;
    if(this.stage!=='racing'){
      this.stageRemaining-=dt;
      if(this.stageRemaining<=0){if(this.stage==='results'){this.newCircuit();this.stage='countdown';this.stageRemaining=3;}else{this.stage='racing';this.release();this.record('go');}}
      return;
    }
    this.raceTime+=dt;if(this.finishGrace!==null)this.finishGrace-=dt;
    const points=KART_TRACKS[this.circuit-1].points;
    for(const kart of this.karts){
      if(kart.finished)continue;
      const input=this.controls.get(kart.id),fresh=input&&this.time-input.at<.35,c=fresh?input:{steer:0,throttle:-1};
      const analog=Number.isFinite(c.steer),magnitude=analog?Math.max(0,c.throttle):Math.min(1,Math.hypot(c.x,c.y));
      const braking=analog?c.throttle<-.12:c.brake,features=trackFeatures(KART_TRACKS[this.circuit-1]);
      kart.boost=Math.max(0,(kart.boost||0)-dt);kart.oil=Math.max(0,(kart.oil||0)-dt);kart.hazardCooldown=Math.max(0,(kart.hazardCooldown||0)-dt);
      if(!kart.hazardCooldown){
        if(features.oil.some(p=>Math.hypot(p.x-kart.x,p.y-kart.y)<22)){kart.oil=1.1;kart.hazardCooldown=2;this.record('oil',kart.id);}
        else if(features.boost.some(p=>Math.hypot(p.x-kart.x,p.y-kart.y)<28)){kart.boost=1.6;kart.hazardCooldown=2;this.record('boost',kart.id);}
      }
      const steer=analog?c.steer:0;
      kart.drifting=analog&&fresh&&Math.abs(steer)>.45&&braking&&kart.speed>70&&!kart.oil;
      if(analog)kart.angle+=steer*(kart.drifting?3.5:2.5)*Math.min(1,kart.speed/55)*dt*(kart.oil?.3:1);
      else if(magnitude>.12){const desired=Math.atan2(c.y,c.x),delta=Math.atan2(Math.sin(desired-kart.angle),Math.cos(desired-kart.angle));kart.angle+=clamp(delta,-5.5*dt,5.5*dt);}
      if(kart.oil)kart.angle+=3.8*dt;
      kart.offRoad=trackPosition(points,kart.x,kart.y).distance>ROAD_RADIUS;
      const desired=braking?(kart.drifting?100:0):(kart.offRoad?48:kart.boost?335:230)*(magnitude>.12?magnitude:0),acceleration=desired<kart.speed?(kart.drifting?90:braking||!fresh?550:100):kart.boost?450:200;
      kart.speed+=clamp(desired-kart.speed,-acceleration*dt,acceleration*dt);
      const grip=kart.drifting?2:kart.oil?1.3:13,heading=kart.travelAngle??kart.angle;
      kart.travelAngle=heading+Math.atan2(Math.sin(kart.angle-heading),Math.cos(kart.angle-heading))*Math.min(1,grip*dt);
      kart.x=clamp(kart.x+Math.cos(kart.travelAngle)*kart.speed*dt,16,944);kart.y=clamp(kart.y+Math.sin(kart.travelAngle)*kart.speed*dt,16,624);
      const bridge=features.bridge,dx=kart.x-bridge.x,dy=kart.y-bridge.y,along=dx*Math.cos(bridge.angle)+dy*Math.sin(bridge.angle),across=-dx*Math.sin(bridge.angle)+dy*Math.cos(bridge.angle);
      kart.elevation=Math.abs(along)<60&&Math.abs(across)<ROAD_RADIUS?Math.sin((along+60)/120*Math.PI)*12:0;
      this.checkpoint(kart);
    }
    // Soft bumping separates the karts without a growing collision history.
    for(let i=0;i<this.karts.length;i++)for(let j=i+1;j<this.karts.length;j++){
      const a=this.karts[i],b=this.karts[j];if(a.finished||b.finished)continue;let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=23)continue;if(d<.01){dx=1;dy=0;d=1;}const push=(23-d)/2;
      a.x=clamp(a.x-dx/d*push,16,944);a.y=clamp(a.y-dy/d*push,16,624);b.x=clamp(b.x+dx/d*push,16,944);b.y=clamp(b.y+dy/d*push,16,624);
    }
    if(this.karts.every(k=>k.finished)||this.finishGrace!==null&&this.finishGrace<=0||this.raceTime>=150)this.finishCircuit();
  }
  advance(seconds){for(let left=Math.min(seconds,.25);left>0;left-=.01)this.step(Math.min(left,.01));}
  snapshot(){return {circuit:this.circuit,track:KART_TRACKS[this.circuit-1].key,laps:this.laps,stage:this.stage,stageRemainingMs:Math.max(0,this.stageRemaining*1000),raceRemainingMs:Math.max(0,(150-this.raceTime)*1000),sampleTime:this.time*1000,karts:this.karts.map(({next,checked,...kart})=>kart),order:this.order().map(k=>({id:k.id,lap:k.lap,finished:k.finished})),standings:this.standings(),results:this.results,events:this.events,winner:this.winner};}
  save(){const {controls,...value}=this;return structuredClone(value);}
}
