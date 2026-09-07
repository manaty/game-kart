import {guideMissile} from './missile-navigation.js';
import {nearWall} from './wall-collision.js';
import { randomInt } from 'node:crypto';
import {spawnItem,useItem,stepItems} from './tank-items.js';

export const TANK_COLORS = ['#64ddff', '#ff7286', '#ffd166', '#b79bff', '#71e5a4'];
const CELL = 80, COLS = 12, ROWS = 8, RADIUS = 17, BULLET_RADIUS = 4;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function maze(random = n => randomInt(n)) {
  const links = new Set(), visited = new Set([0]), stack = [0];
  const link = (a, b) => [Math.min(a, b), Math.max(a, b)].join(':');
  while (stack.length) {
    const at = stack.at(-1), x = at % COLS, y = Math.floor(at / COLS);
    const neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b]) => a>=0 && a<COLS && b>=0 && b<ROWS).map(([a,b])=>b*COLS+a).filter(n=>!visited.has(n));
    if (!neighbors.length) { stack.pop(); continue; }
    const next = neighbors[random(neighbors.length)]; links.add(link(at,next)); visited.add(next); stack.push(next);
  }
  // A few loops give ricochets and flanking routes while every cell stays reachable.
  for (let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) {
    if(x<COLS-1 && random(5)===0) links.add(link(y*COLS+x,y*COLS+x+1));
    if(y<ROWS-1 && random(5)===0) links.add(link(y*COLS+x,(y+1)*COLS+x));
  }
  const walls = [[0,0,COLS*CELL,0],[0,ROWS*CELL,COLS*CELL,ROWS*CELL],[0,0,0,ROWS*CELL],[COLS*CELL,0,COLS*CELL,ROWS*CELL]];
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) {
    if(x<COLS-1 && !links.has(link(y*COLS+x,y*COLS+x+1))) walls.push([(x+1)*CELL,y*CELL,(x+1)*CELL,(y+1)*CELL]);
    if(y<ROWS-1 && !links.has(link(y*COLS+x,(y+1)*COLS+x))) walls.push([x*CELL,(y+1)*CELL,(x+1)*CELL,(y+1)*CELL]);
  }
  return walls;
}
export function hitsWall(x,y,radius,walls) {
  return nearWall(x,y,radius+3,walls);
}

export class Tanks {
  constructor(players, saved) {
    this.players = players.map((p,index)=>({id:p.id,color:TANK_COLORS[index],score:0}));
    this.round=0; this.time=0; this.bulletId=0; this.winner=null; this.roundWinner=null; this.controls=new Map();
    if (saved) Object.assign(this, structuredClone(saved));
    else this.newRound();
    this.controls = new Map();this.pickups ||= [];this.mines ||= [];this.effects ||= [];this.itemId ||= 0;this.itemTimer ??= 5;
  }
  newRound() {
    this.round++;this.layoutRevision=(this.layoutRevision||0)+1; this.walls=maze(); this.bullets=[]; this.roundTime=0; this.settle=0; this.intermission=0; this.roundWinner=null;
    const corners=[[40,40],[920,600],[920,40],[40,600],[440,280]];
    this.tanks=this.players.map((p,i)=>({id:p.id,color:p.color,x:corners[i][0],y:corners[i][1],angle:Math.atan2(320-corners[i][1],480-corners[i][0]),alive:true,cooldown:0}));
    this.pickups=[];this.mines=[];this.effects=[];this.itemId=0;this.itemTimer=5;
    for(let n=0;n<this.players.length;n++)spawnItem(this);
    this.release();
  }
  input(id, value) {
    if (!value || !(Number.isFinite(value.x)&&Number.isFinite(value.y)&&Math.hypot(value.x,value.y)<=1.01 || [-1,0,1].includes(value.throttle)&&[-1,0,1].includes(value.turn)) || typeof value.fire !== 'boolean' || !this.players.some(p=>p.id===id)) throw new Error('invalidControls');
    const previous=this.controls.get(id),tank=this.tanks.find(t=>t.id===id);
    // A held trigger consumes at most one item; releasing it permits another.
    const bonus=Boolean(value.fire&&tank?.item&&(!previous?.fire||this.time-previous.at>.35));
    this.controls.set(id,{...value,bonusHeld:value.fire&&(bonus||previous?.bonusHeld),at:this.time});
    if(bonus)this.useItem(id);
  }
  release(id) { if(id) this.controls.delete(id); else this.controls.clear(); }
  useItem(id){useItem(this,id);}
  addPlayer(player){
    const p={id:player.id,color:TANK_COLORS[this.players.length],score:0};
    const free=[];for(let y=40;y<640;y+=80)for(let x=40;x<960;x+=80)if(!hitsWall(x,y,17,this.walls)&&!this.tanks.some(t=>t.alive&&Math.hypot(t.x-x,t.y-y)<70)&&!this.mines.some(m=>Math.hypot(m.x-x,m.y-y)<70))free.push({x,y});
    if(!free.length)throw new Error('gameUnavailable');
    this.players.push(p);this.tanks.push({...p,...free[randomInt(free.length)],angle:0,alive:true,cooldown:0,shield:2});
  }
  fire(tank,kind) {
    if(!kind && (tank.cooldown>0 || this.bullets.filter(b=>b.owner===tank.id).length>=3)) return;
    const angle=tank.angle+(kind==='micro'?(randomInt(17)-8)/100:0),dx=Math.cos(angle), dy=Math.sin(angle);
    let blocked=false;
    for(let n=0;n<=26;n+=2) if(hitsWall(tank.x+dx*n,tank.y+dy*n,BULLET_RADIUS,this.walls)) {blocked=true;break;}
    this.bullets.push({id:++this.bulletId,owner:tank.id,color:tank.color,x:tank.x+dx*(blocked?0:26),y:tank.y+dy*(blocked?0:26),vx:dx*320*(blocked?-1:1),vy:dy*320*(blocked?-1:1),age:0,kind,bounces:blocked?1:0});
    tank.shots=(tank.shots||0)+1;
    tank.cooldown=.5;
  }
  step(dt) {
    if(this.winner) return;
    this.time+=dt;
    if(this.intermission>0) {this.intermission-=dt;if(this.intermission<=0)this.newRound();return;}
    this.roundTime+=dt;stepItems(this,dt);
    for(const tank of this.tanks) {
      tank.cooldown=Math.max(0,tank.cooldown-dt);tank.shield=Math.max(0,(tank.shield||0)-dt);
      if(!tank.alive)continue;
      const c=this.controls.get(tank.id);
      if(!c || this.time-c.at>.35)continue;
      let throttle=c.throttle;
      if(Number.isFinite(c.x)&&Number.isFinite(c.y)){throttle=Math.min(1,Math.hypot(c.x,c.y));if(throttle<.15)throttle=0;else tank.angle=Math.atan2(c.y,c.x);}
      else tank.angle+=c.turn*2.6*dt;
      const movement=throttle*105*dt;
      const canMove=(x,y)=>!hitsWall(x,y,RADIUS,this.walls)&&!this.tanks.some(other=>other!==tank&&other.alive&&Math.hypot(x-other.x,y-other.y)<RADIUS*2);
      const nx=tank.x+Math.cos(tank.angle)*movement, ny=tank.y+Math.sin(tank.angle)*movement;
      if(canMove(nx,tank.y))tank.x=nx;
      if(canMove(tank.x,ny))tank.y=ny;
      if(c.fire&&!c.bonusHeld)this.fire(tank);
    }
    for(const b of this.bullets) {
      b.age+=dt;
      if(b.kind==='missile')guideMissile(b,this.tanks,this.walls,dt);
      let reflected=false;
      const nx=b.x+b.vx*dt;
      if(hitsWall(nx,b.y,BULLET_RADIUS,this.walls)){b.vx*=-1;reflected=true;}else b.x=nx;
      const ny=b.y+b.vy*dt;
      if(hitsWall(b.x,ny,BULLET_RADIUS,this.walls)){b.vy*=-1;reflected=true;}else b.y=ny;
      if(reflected){b.bounces++;if(b.kind==='missile'){b.routeTime=0;b.vx=0;b.vy=0;}}
      for(const tank of this.tanks) if(!b.dead && tank.alive && !tank.shield && (b.kind==='fragment'||b.owner!==tank.id || b.age>=(b.kind==='missile'?3:.18)) && distance(tank,b)<RADIUS+BULLET_RADIUS) {tank.alive=false;b.dead=true;break;}
    }
    this.bullets=this.bullets.filter(b=>!b.dead&&b.age<(b.kind==='fragment'?.65:b.kind==='micro'?3:b.kind==='missile'?12:7)&&b.bounces<=12);
    const survivors=this.tanks.filter(t=>t.alive);
    this.pickups.length=Math.min(this.pickups.length,survivors.length);
    if(survivors.length<=1) this.settle+=dt; else this.settle=0;
    if(this.settle>=.8 || this.roundTime>=90) {
      this.roundWinner=survivors.length===1?survivors[0].id:null;
      if(this.roundWinner) {const p=this.players.find(p=>p.id===this.roundWinner);p.score++;if(p.score>=5)this.winner=p.id;}
      this.intermission=2.5;this.release();
    }
  }
  advance(seconds) { for(let left=Math.min(seconds,.25);left>0;left-=.01)this.step(Math.min(left,.01)); }
  snapshot() {return {width:960,height:640,sampleTime:this.time*1000,layoutRevision:this.layoutRevision||0,round:this.round,roundRemainingMs:Math.max(0,90000-this.roundTime*1000),intermissionMs:Math.max(0,this.intermission*1000),roundWinner:this.roundWinner,winner:this.winner,pickups:this.pickups,mines:this.mines,effects:this.effects,walls:this.walls,tanks:this.tanks.map(({cooldown,...tank})=>tank),bullets:this.bullets.map(({x,y,color,id,kind})=>({x,y,color,id,kind})),scores:this.players.map(({id,score})=>({id,score}))};}
  save() { const {controls,...saved}=this;return structuredClone(saved); }
}
