import {randomInt} from 'node:crypto';
export const ITEM_TYPES=['mine','burst','missile','laser','pickaxe'];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pointWall=(x,y,w)=>Math.hypot(x-Math.max(Math.min(w[0],w[2]),Math.min(x,Math.max(w[0],w[2]))),y-Math.max(Math.min(w[1],w[3]),Math.min(y,Math.max(w[1],w[3]))));
export function spawnItem(game,type=ITEM_TYPES[randomInt(5)]) {
  if(game.pickups.length>=game.tanks.filter(t=>t.alive).length)return;
  for(let n=0;n<150;n++){
    const p={id:++game.itemId,type,x:40+randomInt(12)*80,y:40+randomInt(8)*80};
    if(game.pickups.some(q=>dist(p,q)<70)||game.tanks.some(t=>dist(p,t)<65)||game.walls.some(w=>pointWall(p.x,p.y,w)<25))continue;
    game.pickups.push(p);return;
  }
}
function connected(walls){
  const seen=new Set(['40:40']),todo=[[40,40]];
  while(todo.length){const [x,y]=todo.pop();for(const [nx,ny] of [[x+80,y],[x-80,y],[x,y+80],[x,y-80]]){
    const key=nx+':'+ny;if(nx<0||nx>960||ny<0||ny>640||seen.has(key)||walls.some(w=>pointWall((x+nx)/2,(y+ny)/2,w)<20))continue;seen.add(key);todo.push([nx,ny]);
  }}return seen.size===96;
}
export function useItem(game,id){
  const tank=game.tanks.find(t=>t.id===id);
  if(!tank?.alive||!tank.item||game.intermission>0)throw new Error('noItem');
  const type=tank.item,dx=Math.cos(tank.angle),dy=Math.sin(tank.angle);
  if(type==='mine')game.mines.push({id:++game.itemId,owner:id,color:tank.color,x:tank.x,y:tank.y,arm:5,age:0});
  if(type==='burst'){tank.burst=6;tank.burstDelay=0;}
  if(type==='missile')game.bullets.push({id:++game.bulletId,owner:id,color:tank.color,x:tank.x,y:tank.y,vx:dx*180,vy:dy*180,age:0,bounces:0,kind:'missile'});
  if(type==='laser'){
    game.effects.push({id:++game.itemId,kind:'laser',x:tank.x,y:tank.y,x2:tank.x+dx*1400,y2:tank.y+dy*1400,color:tank.color,life:.45});
    for(const other of game.tanks){const x=other.x-tank.x,y=other.y-tank.y;if(other!==tank&&other.alive&&x*dx+y*dy>0&&Math.abs(x*dy-y*dx)<20)other.alive=false;}
  }
  if(type==='pickaxe'){
    const nearby=game.walls.map((w,i)=>({w,i,d:pointWall(tank.x,tank.y,w)})).filter(v=>v.i>=4&&v.d<110).sort((a,b)=>a.d-b.d);
    let changed=false;
    for(const {w,i} of nearby){
      rotation: for(const pivot of [0,2])for(const sign of [1,-1]){
        const ax=w[pivot],ay=w[pivot+1],bx=w[2-pivot],by=w[3-pivot];
        const candidate=[ax,ay,ax-sign*(by-ay),ay+sign*(bx-ax)];
        if(candidate.some((v,j)=>v<0||v>(j%2?640:960))||candidate[0]===candidate[2]&&[0,960].includes(candidate[0])||candidate[1]===candidate[3]&&[0,640].includes(candidate[1]))continue;
        if(game.tanks.some(t=>t.alive&&pointWall(t.x,t.y,candidate)<22)||game.walls.some((q,j)=>j!==i&&pointWall((candidate[0]+candidate[2])/2,(candidate[1]+candidate[3])/2,q)<3))continue;
        const next=game.walls.map((q,j)=>j===i?candidate:q);if(!connected(next))continue;
        game.walls=next;game.layoutRevision=(game.layoutRevision||0)+1;changed=true;break rotation;
      }
      if(changed)break;
    }
    if(!changed)throw new Error('noWall');
  }
  tank.item=null;
  if(type!=='burst')tank.shots=(tank.shots||0)+1;
  game.pickups.length=Math.min(game.pickups.length,game.tanks.filter(t=>t.alive).length);
}
export function stepItems(game,dt){
  game.itemTimer-=dt;if(game.itemTimer<=0){spawnItem(game);game.itemTimer=5;}
  for(const tank of game.tanks)if(tank.alive){
    if(!tank.item){const index=game.pickups.findIndex(p=>dist(p,tank)<28);if(index>=0)tank.item=game.pickups.splice(index,1)[0].type;}
    if(tank.burst>0){tank.burstDelay-=dt;if(tank.burstDelay<=0){game.fire(tank,'micro');tank.burst--;tank.burstDelay=.09;}}
  }
  for(const mine of game.mines){mine.age=(mine.age||0)+dt;mine.arm=Math.max(0,5-mine.age);if(mine.age>=20||mine.arm<=0&&game.tanks.some(t=>t.alive&&dist(t,mine)<30)){
    mine.dead=true;
    for(let n=0;n<16;n++){const angle=n*Math.PI/8;game.bullets.push({id:++game.bulletId,owner:mine.owner,color:mine.color,x:mine.x,y:mine.y,vx:Math.cos(angle)*180,vy:Math.sin(angle)*180,age:0,bounces:0,kind:'fragment'});}
    game.effects.push({id:++game.itemId,kind:'blast',x:mine.x,y:mine.y,color:mine.color,life:.4});
  }}
  game.mines=game.mines.filter(m=>!m.dead);game.effects=game.effects.filter(e=>(e.life-=dt)>0);
}
