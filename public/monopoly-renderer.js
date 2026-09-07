import {monopolyRoute} from './monopoly-motion.js';
import * as THREE from 'three';
import {BOARD,GROUP_COLORS} from './monopoly-board.js';
import {boardPoint} from './monopoly-ui.js';
import {m} from './monopoly-i18n.js';
const position=i=>{const [x,y]=boardPoint(i);return {x:(x-5)*64,z:(y-5)*64};};
export function createMonopolyRenderer(host,language){
 let renderer;
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{host.classList.add('mono-fallback');return null;}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));renderer.setClearColor(0x0b1720,0);host.append(renderer.domElement);renderer.domElement.className='mono-3d';
 const reveal=document.createElement('div');reveal.className='mono-card-reveal';host.append(reveal);let revealTimer;
 const fallback=host.querySelector('svg');if(fallback)fallback.style.display='none';
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,1,3000);
 scene.add(new THREE.HemisphereLight(0xe4f4ff,0x4e4933,1.7));const light=new THREE.DirectionalLight(0xfff5dc,2.1);light.position.set(-250,650,300);scene.add(light);
 const materials=[],geometries=[],textures=[],pawns=new Map(),deeds=new Map(),motions=new Map();let state,lastEvent=0,frame,endAt=0,rollAt=-Infinity,lastSize='',drawCard=null,stopped=false;
 const geometry=g=>{geometries.push(g);return g;},material=p=>{const v=new THREE.MeshStandardMaterial(p);materials.push(v);return v;};
 const texture=(width,height,paint)=>{const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d'));const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t;};
 function boardTexture(){return texture(1408,1408,c=>{
  c.fillStyle='#d6e3ca';c.fillRect(0,0,1408,1408);c.save();c.scale(2,2);
  for(const tile of BOARD){const [x,y]=boardPoint(tile.index);c.save();c.translate(x*64,y*64);c.fillStyle='#f1efdb';c.fillRect(1,1,62,62);c.strokeStyle='#325b50';c.lineWidth=1;c.strokeRect(1,1,62,62);c.fillStyle=tile.group!==undefined?GROUP_COLORS[tile.group]:'#668e7c';c.fillRect(2,2,60,12);c.fillStyle='#183d35';c.font='bold 8px sans-serif';c.textAlign='center';const words=(tile.price?tile.name:m(language,tile.type)).split(' ');c.fillText(words.slice(0,-1).join(' ')||words[0],32,27);if(words.length>1)c.fillText(words.at(-1),32,38);c.font='9px sans-serif';c.fillText(String(tile.price||''),32,53);c.restore();}
  c.textAlign='center';c.fillStyle='#1c5144';c.font='bold 44px sans-serif';c.fillText('MONOPOLY',352,248);c.font='17px sans-serif';c.fillText(m(language,'monoTitle'),352,277);c.strokeStyle='#729783';c.lineWidth=2;c.strokeRect(85,85,534,534);c.restore();
 });}
 const box=geometry(new THREE.BoxGeometry(704,15,704)),side=material({color:0x243c34,roughness:.55}),top=material({map:boardTexture(),roughness:.9});scene.add(new THREE.Mesh(box,[side,side,top,side,side,side]));
 const base=new THREE.Mesh(geometry(new THREE.BoxGeometry(718,12,718)),material({color:0x805b38,roughness:.4}));base.position.y=-12;scene.add(base);
 const pawnBody=geometry(new THREE.CylinderGeometry(5,13,22,16)),pawnHead=geometry(new THREE.SphereGeometry(9,16,12)),pawnFoot=geometry(new THREE.CylinderGeometry(14,16,5,16));
 const houseGeo=geometry(new THREE.BoxGeometry(14,12,12)),roofGeo=geometry(new THREE.ConeGeometry(12,8,4)),houseMat=material({color:0x42a071}),roofMat=material({color:0xb55249});
 const tileGeo=geometry(new THREE.BoxGeometry(59,2,59));
 const deckGeo=geometry(new THREE.BoxGeometry(74,3,106)),decks={};
 for(const [key,x,color] of [['chance',-125,'#cf9e51'],['community',125,'#66a0ad']]){
  const t=texture(148,212,c=>{c.fillStyle=color;c.fillRect(0,0,148,212);c.strokeStyle='#f9efc6';c.lineWidth=6;c.strokeRect(8,8,132,196);c.fillStyle='#fff7d5';c.font='bold 65px serif';c.textAlign='center';c.fillText(key==='chance'?'?':'✦',74,115);c.font='bold 14px sans-serif';c.fillText(m(language,key).slice(0,17),74,158);});
  const cardMat=material({map:t}),edge=material({color:0xf0e4c9});const group=new THREE.Group();for(let i=0;i<5;i++){const card=new THREE.Mesh(deckGeo,[edge,edge,cardMat,edge,edge,edge]);card.position.set(i%2,10+i*3,0);group.add(card);}group.position.set(x,0,160);scene.add(group);decks[key]={group,cardMat,edge};
 }
 const diceGeo=geometry(new THREE.BoxGeometry(35,35,35)),dice=[];
 const pips={1:[[1,1]],2:[[0,0],[2,2]],3:[[0,0],[1,1],[2,2]],4:[[0,0],[2,0],[0,2],[2,2]],5:[[0,0],[2,0],[1,1],[0,2],[2,2]],6:[[0,0],[2,0],[0,1],[2,1],[0,2],[2,2]]};
 const dieMaterials=[3,4,1,6,2,5].map(n=>material({map:texture(128,128,c=>{c.fillStyle='#fff5da';c.fillRect(0,0,128,128);c.strokeStyle='#d7cbb2';c.lineWidth=8;c.strokeRect(0,0,128,128);c.fillStyle='#203a36';for(const [x,y] of pips[n]){c.beginPath();c.arc(30+x*34,30+y*34,10,0,Math.PI*2);c.fill();}}),roughness:.45}));
 for(let i=0;i<2;i++){const die=new THREE.Mesh(diceGeo,dieMaterials);die.position.set(i?32:-32,27,35);scene.add(die);dice.push(die);}
 const normals={1:[0,1,0],6:[0,-1,0],3:[1,0,0],4:[-1,0,0],2:[0,0,1],5:[0,0,-1]};
 const dieTarget=n=>new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...normals[n]),new THREE.Vector3(0,1,0));
 function resize(){const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;const size=width+':'+height;if(size===lastSize)return;lastSize=size;renderer.setSize(width,height,false);camera.aspect=width/height;const distance=Math.max(1,1/camera.aspect)*900;camera.position.set(60,distance*.87,distance*.73);camera.lookAt(0,0,25);camera.updateProjectionMatrix();}
 function draw(at){frame=undefined;if(stopped||!state)return;resize();const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  for(const p of state.players){const pawn=pawns.get(p.id),motion=motions.get(p.id);if(!pawn)continue;let point=position(p.position),height=0;
   if(motion&&!reduced){const progress=Math.min(1,(at-motion.at)/motion.duration),scaled=progress*motion.steps,step=Math.min(motion.steps-1,Math.floor(scaled)),f=scaled-step,a=position(motion.route[step]),b=position(motion.route[step+1]);point={x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};height=Math.sin(f*Math.PI)*30;if(progress>=1){motions.delete(p.id);point=position(p.position);height=0;}}
   const index=state.players.findIndex(x=>x.id===p.id);pawn.position.set(point.x+(index%3-1)*16,12+height,point.z+(Math.floor(index/3)-.5)*18);pawn.visible=!p.bankrupt;
  }
  const rolling=!reduced&&(at-rollAt)<1000;
  dice.forEach((die,i)=>{const target=dieTarget(state.dice[i]);if(rolling){const t=(at-rollAt)/1000;die.position.y=27+Math.sin(t*Math.PI)*65;die.rotation.set(t*15+i,t*12,t*18);if(t>.8)die.quaternion.slerp(target,(t-.8)/.2);}else{die.position.y=27;die.quaternion.copy(target);}});
  for(const [i,d] of deeds){const pulse=d.userData.pulse?Math.max(0,1-(at-d.userData.pulse)/1700):0;d.position.y=9+Math.sin(pulse*Math.PI)*10;d.material.emissiveIntensity=pulse*.8;}
  if(drawCard){const t=Math.min(1,(at-drawCard.at)/1700),mesh=drawCard.mesh;const half=Math.min(1,t*2),delivery=Math.max(0,(t-.5)*2);mesh.position.set(drawCard.x*(1-half)+drawCard.target.x*delivery,28+Math.sin(t*Math.PI)*170,160*(1-half)+drawCard.target.z*delivery);mesh.rotation.z=Math.sin(t*Math.PI)*.35;mesh.rotation.x=-t*Math.PI*2;if(t>=1){scene.remove(mesh);drawCard=null;}}
  renderer.render(scene,camera);if(at<endAt&&!document.hidden)frame=requestAnimationFrame(draw);
 }
 function request(){if(frame===undefined)frame=requestAnimationFrame(draw);}
 const onResize=()=>{lastSize='';request();};window.addEventListener('resize',onResize);
 return {update(game,players){const now=performance.now(),old=state;state=game;
  for(const p of game.players){let pawn=pawns.get(p.id);if(!pawn){pawn=new THREE.Group();const info=players.find(x=>x.id===p.id),mat=material({color:info?.color||'#e8bb72',metalness:.55,roughness:.25});for(const [geo,y] of [[pawnFoot,0],[pawnBody,13],[pawnHead,31]]){const part=new THREE.Mesh(geo,mat);part.position.y=y;pawn.add(part);}pawns.set(p.id,pawn);scene.add(pawn);}
   const before=old?.players.find(x=>x.id===p.id);if(before&&before.position!==p.position){const events=game.events.filter(e=>e.id>lastEvent&&e.player===p.id),route=monopolyRoute(before.position,p.position,events),steps=route.length-1;motions.set(p.id,{at:now,route,steps,duration:Math.min(2400,steps*160)});endAt=Math.max(endAt,now+2500);}
  }
  for(let i=0;i<game.properties.length;i++){const d=game.properties[i],prev=old?.properties[i];if(!d.owner){if(deeds.has(i)){scene.remove(deeds.get(i));deeds.delete(i);}continue;}
   if(!deeds.has(i)||prev?.owner!==d.owner){if(deeds.has(i))scene.remove(deeds.get(i));const mat=material({color:players.find(p=>p.id===d.owner)?.color||'#c6b986',transparent:true,opacity:.45,emissive:0xffd267,emissiveIntensity:0}),tile=new THREE.Mesh(tileGeo,mat),pos=position(i);tile.position.set(pos.x,9,pos.z);deeds.set(i,tile);scene.add(tile);if(old){tile.userData.pulse=now;endAt=Math.max(endAt,now+1800);}}
   const tile=deeds.get(i);if(tile.userData.houses!==d.houses){tile.clear();tile.material.opacity=d.mortgaged?.16:.45;for(let n=0;n<(d.houses===5?1:d.houses);n++){const house=new THREE.Mesh(houseGeo,houseMat);house.position.set(d.houses===5?0:-20+n*10,d.houses===5?16:9,-17);if(d.houses===5){house.scale.set(2,2,1.3);house.material=roofMat;}tile.add(house);const roof=new THREE.Mesh(roofGeo,roofMat);roof.rotation.y=Math.PI/4;roof.position.set(d.houses===5?0:-20+n*10,d.houses===5?33:19,-17);if(d.houses===5)roof.scale.set(1.8,1,1.3);tile.add(roof);}tile.userData.houses=d.houses;}
  }
  for(const e of game.events)if(e.id>lastEvent&&old){if(e.type==='roll'){rollAt=now;endAt=Math.max(endAt,now+1300);}if(/^card[0-7]$/.test(e.type)){clearTimeout(revealTimer);reveal.textContent=m(language,e.type);reveal.classList.remove('show');requestAnimationFrame(()=>reveal.classList.add('show'));revealTimer=setTimeout(()=>reveal.classList.remove('show'),2600);if(drawCard)scene.remove(drawCard.mesh);const deck=decks[BOARD[e.tile]?.type]||decks.chance,mesh=new THREE.Mesh(deckGeo,[deck.edge,deck.edge,deck.cardMat,deck.edge,deck.edge,deck.edge]);scene.add(mesh);drawCard={mesh,x:deck.group.position.x,target:position(game.players.find(p=>p.id===e.player)?.position||e.tile),at:now};endAt=Math.max(endAt,now+1900);}}
  lastEvent=game.events.at(-1)?.id||0;request();
 },dispose(){stopped=true;clearTimeout(revealTimer);reveal.remove();cancelAnimationFrame(frame);window.removeEventListener('resize',onResize);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.domElement.remove();if(fallback)fallback.style.display='';}};
}
