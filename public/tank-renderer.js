import {REGIONS,paintTerrain} from './region-art.js';
import {iconPaths} from './item-icons.js';
const paths=typeof Path2D==='function'?Object.fromEntries(Object.entries(iconPaths).map(([k,values])=>[k,values.map(d=>new Path2D(d))])):{};
export function createTankRenderer(canvas,makeCanvas=()=>document.createElement('canvas')){
  const ctx=canvas.getContext('2d'),background=makeCanvas();background.width=960;background.height=640;
  let cachedLayout=null;const alive=new Map(),explosions=[];
  function draw(game,players){
    if(!ctx)return;
    const layout=(game?.round||0)+':'+(game?.layoutRevision||0);
    if(layout!==cachedLayout){
      cachedLayout=layout;const ctx=background.getContext('2d');
      const region=REGIONS[((game?.round||1)-1)%REGIONS.length];paintTerrain(ctx,region.key);
      // Raised masonry, soft offset shadows and seams are cached with the maze.
      if(game){
        const walls=game.walls||[];ctx.lineCap='round';
        for(const [width,color,offset] of [[13,'#0a141c70',5],[10,region.wall,0],[2,region.edge,-2]]){
          ctx.lineWidth=width;ctx.strokeStyle=color;ctx.beginPath();for(const [x1,y1,x2,y2] of walls){ctx.moveTo(x1+offset,y1+offset);ctx.lineTo(x2+offset,y2+offset);}ctx.stroke();
        }
        ctx.strokeStyle='#14232b55';ctx.lineWidth=1;for(const [x1,y1,x2,y2] of walls){const len=Math.hypot(x2-x1,y2-y1);for(let t=18;t<len;t+=20){const x=x1+(x2-x1)*t/len,y=y1+(y2-y1)*t/len;ctx.beginPath();ctx.moveTo(x-(y2===y1?0:4),y-(y2===y1?4:0));ctx.lineTo(x+(y2===y1?0:4),y+(y2===y1?4:0));ctx.stroke();}}
      }
    }
    ctx.drawImage(background,0,0);
    if(game){
      for(const pickup of game.pickups||[]){ctx.fillStyle='#ffdb75';ctx.beginPath();ctx.arc(pickup.x,pickup.y,14,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(pickup.x-12,pickup.y-12);ctx.strokeStyle='#172331';ctx.lineWidth=2;ctx.lineCap='round';for(const path of paths[pickup.type]||[])ctx.stroke(path);ctx.restore();}
      for(const mine of game.mines||[]){ctx.strokeStyle=mine.arm>0?'#8a9aa6':mine.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(mine.x,mine.y,10,0,Math.PI*2);ctx.stroke();ctx.fillStyle=mine.color;ctx.fillRect(mine.x-4,mine.y-4,8,8);}

      for(const tank of game.tanks){
        if(alive.get(tank.id)&&!tank.alive)explosions.push({x:tank.x,y:tank.y,color:tank.color,at:Date.now()});alive.set(tank.id,tank.alive);
        ctx.save();ctx.translate(tank.x,tank.y);ctx.rotate(tank.angle);ctx.globalAlpha=tank.alive?1:.22;
        ctx.fillStyle='#070c11';ctx.fillRect(-20,-19,40,10);ctx.fillRect(-20,9,40,10);
        ctx.fillStyle='#0005';ctx.fillRect(-15,-8,36,25);ctx.fillStyle=tank.color;ctx.fillRect(-16,-12,32,24);ctx.strokeStyle='#ffffff85';ctx.lineWidth=2;ctx.strokeRect?.(-14,-10,28,20);for(let i=-16;i<20;i+=6){ctx.fillStyle='#728087';ctx.fillRect(i,-18,3,7);ctx.fillRect(i,11,3,7);}ctx.fillRect(0,-4,29,8);
        ctx.fillStyle='#142432';ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.restore();
        ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(String(players.find(p=>p.id===tank.id)?.number||''),tank.x,tank.y+4);
        if(!tank.alive){ctx.strokeStyle=tank.color;ctx.beginPath();ctx.moveTo(tank.x-12,tank.y-12);ctx.lineTo(tank.x+12,tank.y+12);ctx.moveTo(tank.x+12,tank.y-12);ctx.lineTo(tank.x-12,tank.y+12);ctx.stroke();}
      }
      for(const effect of game.effects||[]){ctx.strokeStyle=effect.color;ctx.lineWidth=effect.kind==='laser'?6:3;ctx.beginPath();if(effect.kind==='laser'){ctx.moveTo(effect.x,effect.y);ctx.lineTo(effect.x2,effect.y2);}else ctx.arc(effect.x,effect.y,65*(1-effect.life/.4),0,Math.PI*2);ctx.stroke();}
      for(const bullet of game.bullets){ctx.fillStyle=bullet.color;ctx.beginPath();ctx.arc(bullet.x,bullet.y,['micro','fragment'].includes(bullet.kind)?2:bullet.kind==='missile'?8:5,0,Math.PI*2);ctx.fill();}
      for(let n=explosions.length-1;n>=0;n--){const e=explosions[n],age=(Date.now()-e.at)/650;if(age>=1){explosions.splice(n,1);continue;}ctx.globalAlpha=1-age;ctx.fillStyle=e.color;for(let i=0;i<12;i++){const angle=i*Math.PI/6,r=12+age*55;ctx.fillRect(e.x+Math.cos(angle)*r-3,e.y+Math.sin(angle)*r-3,6,6);}ctx.globalAlpha=1;}
    }
  }
  return {draw};
}
