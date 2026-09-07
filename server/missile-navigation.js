// Grid routing is cached per wall layout; steering slows before tight corners.
import {nearWall} from './wall-collision.js';
const graphs=new WeakMap(),CELL=80,COLS=12,ROWS=8;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const blocked=(x,y,walls)=>nearWall(x,y,10,walls);
export function clearMissilePath(a,b,walls){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/6));for(let i=1;i<=steps;i++)if(blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,walls))return false;return true;}
const cell=p=>clamp(Math.floor(p.y/CELL),0,ROWS-1)*COLS+clamp(Math.floor(p.x/CELL),0,COLS-1);
const center=n=>({x:n%COLS*CELL+40,y:Math.floor(n/COLS)*CELL+40});
function graph(walls){if(graphs.has(walls))return graphs.get(walls);const nodes=Array.from({length:96},()=>[]);for(let n=0;n<96;n++){const x=n%COLS,y=Math.floor(n/COLS);for(const [a,b] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(a>=0&&a<COLS&&b>=0&&b<ROWS){const next=b*COLS+a;if(clearMissilePath(center(n),center(next),walls))nodes[n].push(next);}}graphs.set(walls,nodes);return nodes;}
export function missileRoute(from,to,walls){
 if(clearMissilePath(from,to,walls))return [{x:to.x,y:to.y}];
 const start=cell(from),end=cell(to),nodes=graph(walls),queue=[start],prev=new Map([[start,null]]);
 for(let i=0;i<queue.length&&!prev.has(end);i++)for(const next of nodes[queue[i]])if(!prev.has(next)){prev.set(next,queue[i]);queue.push(next);}
 if(!prev.has(end))return [];
 const route=[];for(let n=end;n!==null;n=prev.get(n))route.unshift(center(n));route.push({x:to.x,y:to.y});return route;
}
export function guideMissile(b,tanks,walls,dt){
 const target=tanks.filter(t=>t.alive&&t.id!==b.owner).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];if(!target)return;
 b.routeTime=(b.routeTime||0)-dt;
 if(b.routeTime<=0||b.target!==target.id||b.layout!==walls){b.route=missileRoute(b,target,walls);b.routeTime=.2;b.target=target.id;Object.defineProperty(b,'layout',{value:walls,writable:true,enumerable:false,configurable:true});}
 let waypoint;
 for(const point of b.route||[]){if(clearMissilePath(b,point,walls))waypoint=point;else break;}
 if(!waypoint){b.vx=0;b.vy=0;b.routeTime=0;return;}
 const angle=b.heading??Math.atan2(b.vy,b.vx),desired=Math.atan2(waypoint.y-b.y,waypoint.x-b.x),delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle));
 b.heading=angle+clamp(delta,-Math.PI*1.5*dt,Math.PI*1.5*dt);
 const speed=180*Math.max(0,Math.cos(delta))**3;
 b.vx=Math.cos(b.heading)*speed;b.vy=Math.sin(b.heading)*speed;
 if(!clearMissilePath(b,{x:b.x+b.vx*dt,y:b.y+b.vy*dt},walls)){b.vx=0;b.vy=0;b.routeTime=0;}
}
