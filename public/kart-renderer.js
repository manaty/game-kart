import {KART_TRACKS,ROAD_RADIUS,trackPosition,trackFeatures} from './kart-tracks.js';
import {paintTerrain,paintScenery} from './region-art.js';
export function createKartRenderer(canvas){
 const ctx=canvas.getContext('2d'),back=document.createElement('canvas');back.width=960;back.height=640;
 let circuit=0;const avatars=new Map(),skids=[],lastSkid=new Map();
 const track=(points,c)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
 function avatar(url){if(!url)return null;if(!avatars.has(url)){const img=new Image();img.src=url;avatars.set(url,img);}const img=avatars.get(url);return img.complete&&img.naturalWidth?img:null;}
 function bridge(c,b){c.save();c.translate(b.x,b.y);c.rotate(b.angle);c.fillStyle='#0006';c.fillRect(-62,-47+9,124,94);c.fillStyle='#736c66';c.fillRect(-60,-46,120,92);for(let x=-58;x<60;x+=10){c.fillStyle=x%20?'#cbbba0':'#b6a68b';c.fillRect(x,-43,8,86);}for(const y of [-46,43]){c.fillStyle='#e2d7b5';c.fillRect(-63,y,126,4);c.fillStyle='#716b62';for(let x=-58;x<=60;x+=24)c.fillRect(x,y-3,4,10);}c.restore();}
 return {draw(game,players){
  if(!ctx)return;const config=KART_TRACKS[(game?.circuit||1)-1],features=trackFeatures(config);
  if(circuit!==(game?.circuit||1)){
   circuit=game?.circuit||1;skids.length=0;lastSkid.clear();const c=back.getContext('2d');paintTerrain(c,config.key);paintScenery(c,config.key,(x,y)=>trackPosition(config.points,x,y).distance>ROAD_RADIUS+38);
   // River under the raised crossing, then cached road and plank bridge.
   const b=features.bridge;c.save();c.translate(b.x,b.y);c.rotate(b.angle);c.fillStyle=config.key==='desert'?'#5e9c9c':'#277b95';c.fillRect(-35,-105,70,210);c.strokeStyle='#b8edf58a';c.lineWidth=2;for(let y=-90;y<100;y+=15){c.beginPath();c.moveTo(-28,y);c.lineTo(28,y+5);c.stroke();}c.restore();
   c.lineJoin='round';c.lineCap='round';track(config.points,c);c.strokeStyle='#0006';c.lineWidth=ROAD_RADIUS*2+24;c.stroke();c.strokeStyle='#e2d8c3';c.lineWidth=ROAD_RADIUS*2+12;c.stroke();c.setLineDash([12,12]);c.strokeStyle=config.accent;c.stroke();c.setLineDash([]);c.strokeStyle=config.road;c.lineWidth=ROAD_RADIUS*2;c.stroke();
   c.setLineDash([16,20]);c.strokeStyle='#eef4e55e';c.lineWidth=2;c.stroke();c.setLineDash([]);
   for(let n=0;n<300;n++){const x=(n*47+37)%960,y=(n*137+19)%640;if(trackPosition(config.points,x,y).distance<ROAD_RADIUS-4){c.fillStyle='#f5eee710';c.fillRect(x,y,2,1);}}
   bridge(c,features.bridge);
   for(const oil of features.oil){c.save();c.translate(oil.x,oil.y);c.rotate(oil.angle);c.scale(1.5,.8);c.fillStyle='#0b1023';c.beginPath();c.arc(0,0,18,0,Math.PI*2);c.fill();for(let i=0;i<3;i++){c.strokeStyle=['#9552ba77','#4baba966','#6581cf66'][i];c.lineWidth=3;c.beginPath();c.arc(i*2-2,i-1,8+i*3,.5,4.8);c.stroke();}c.restore();}
   const [a,b2]=config.points,angle=Math.atan2(b2[1]-a[1],b2[0]-a[0]);c.save();c.translate(a[0],a[1]);c.rotate(angle);for(let i=0;i<2;i++)for(let j=0;j<8;j++){c.fillStyle=(i+j)%2?'#fff':'#14202c';c.fillRect(i*9-9,j*10-40,9,10);}c.restore();
   c.fillStyle=config.accent;c.font='bold 74px sans-serif';c.textAlign='center';c.globalAlpha=.3;c.fillText(String(circuit).padStart(2,'0'),480,350);c.globalAlpha=1;
  }
  ctx.drawImage(back,0,0);if(!game)return;
  for(const boost of features.boost){ctx.save();ctx.translate(boost.x,boost.y);ctx.rotate(boost.angle);ctx.fillStyle='#142b38';ctx.fillRect(-24,-28,48,56);ctx.strokeStyle='#b6fff3';ctx.lineWidth=5;ctx.globalAlpha=.65+Math.sin((game.sampleTime||0)/160)*.25;for(const x of [-16,0,16]){ctx.beginPath();ctx.moveTo(x-5,-18);ctx.lineTo(x+6,0);ctx.lineTo(x-5,18);ctx.stroke();}ctx.restore();}
  const now=Date.now();while(skids[0]&&now-skids[0].at>1600)skids.shift();for(const mark of skids){ctx.globalAlpha=(1-(now-mark.at)/1600)*.5;ctx.strokeStyle='#070e1e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(mark.x,mark.y);ctx.lineTo(mark.toX,mark.toY);ctx.stroke();}ctx.globalAlpha=1;
  for(const kart of game.tanks||game.karts||[]){
   const previous=lastSkid.get(kart.id);if((kart.drifting||kart.oil)&&previous&&Math.hypot(previous.x-kart.x,previous.y-kart.y)>2){skids.push({x:previous.x,y:previous.y,toX:kart.x,toY:kart.y,at:now});lastSkid.set(kart.id,{x:kart.x,y:kart.y});}else if(!previous||!kart.drifting&&!kart.oil)lastSkid.set(kart.id,{x:kart.x,y:kart.y});if(skids.length>240)skids.shift();
   ctx.save();ctx.translate(kart.x+4,kart.y+7);ctx.rotate(kart.angle);ctx.fillStyle='#0006';ctx.fillRect(-19,-12,40,24);ctx.restore();
   ctx.save();ctx.translate(kart.x,kart.y-(kart.elevation||0)*.6);ctx.rotate(kart.angle);const scale=1+(kart.elevation||0)*.009;ctx.scale(scale,scale);
   if(kart.boost){ctx.fillStyle='#78e8ff';ctx.beginPath();ctx.moveTo(-16,-7);ctx.lineTo(-42-Math.sin(now/50)*6,0);ctx.lineTo(-16,7);ctx.fill();ctx.fillStyle='#fff9b0';ctx.fillRect(-28,-3,12,6);}
   ctx.fillStyle='#091324';for(const x of [-15,8])for(const y of [-16,9]){ctx.fillRect(x,y,11,7);ctx.fillStyle='#647687';ctx.fillRect(x+2,y+2,7,2);ctx.fillStyle='#091324';}
   const paint=ctx.createLinearGradient(-10,-12,10,12);paint.addColorStop(0,'#edf8ff');paint.addColorStop(.28,kart.color);paint.addColorStop(1,'#23364d');ctx.fillStyle=paint;ctx.beginPath();ctx.moveTo(-17,-10);ctx.lineTo(10,-10);ctx.lineTo(21,-6);ctx.lineTo(21,6);ctx.lineTo(10,10);ctx.lineTo(-17,10);ctx.closePath();ctx.fill();
   ctx.fillStyle=kart.color;ctx.fillRect(-20,-13,6,26);ctx.fillRect(15,-14,5,28);ctx.fillStyle='#ecf6ff';ctx.fillRect(6,-3,15,6);ctx.fillStyle='#172839';ctx.beginPath();ctx.arc(-3,0,8,0,Math.PI*2);ctx.fill();
   const info=players.find(p=>p.id===kart.id),image=avatar(info?.avatar);if(image){ctx.save();ctx.beginPath();ctx.arc(-3,0,7,0,Math.PI*2);ctx.clip();ctx.drawImage(image,-10,-7,14,14);ctx.restore();}else{ctx.fillStyle='#f4d097';ctx.beginPath();ctx.arc(-3,0,5,0,Math.PI*2);ctx.fill();}
   ctx.restore();ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(String(info?.number||''),kart.x,kart.y-24-(kart.elevation||0)*.6);
  }
 }};
}
