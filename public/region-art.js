export const REGIONS=[
 {key:'desert',name:'Dune Citadel',ground:'#b99159',shade:'#ddbe7b',wall:'#ad7850',edge:'#f9db9c'},
 {key:'coast',name:'Coral Outpost',ground:'#255f66',shade:'#478c89',wall:'#91b9ad',edge:'#def9df'},
 {key:'forest',name:'Emerald Ruins',ground:'#284b3a',shade:'#46634b',wall:'#729076',edge:'#bdd4a2'},
 {key:'alpine',name:'Glacier Fortress',ground:'#abcbd5',shade:'#d9e5e3',wall:'#7299ae',edge:'#f2fbff'},
 {key:'volcano',name:'Obsidian Caldera',ground:'#322f3b',shade:'#51434b',wall:'#5a5260',edge:'#ec9673'}
];
export function paintTerrain(c,key){
 const region=REGIONS.find(r=>r.key===key)||{ground:key==='harbor'?'#174660':'#211d38',shade:key==='harbor'?'#346980':'#493759'};
 const grad=c.createLinearGradient(0,0,960,640);grad.addColorStop(0,region.shade);grad.addColorStop(1,region.ground);c.fillStyle=grad;c.fillRect(0,0,960,640);
 for(let i=0;i<250;i++){const x=(i*173+29)%960,y=(i*97+41)%640;c.fillStyle=i%3?'#ffffff09':'#00000014';c.beginPath();c.arc(x,y,2+i%8,0,Math.PI*2);c.fill();}
 for(let n=0;n<22;n++){c.strokeStyle=key==='volcano'?'#f68f4833':key==='coast'||key==='harbor'?'#abf8ef25':'#ffffff15';c.lineWidth=n%3+1;c.beginPath();for(let x=0;x<=960;x+=16){const y=n*33+Math.sin(x*.012+n)*12;x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
}
export function paintScenery(c,key,clear){
 for(let n=0;n<100;n++){const x=(n*173+61)%960,y=(n*97+35)%640;if(!clear(x,y))continue;const r=10+n%18;
 c.save();c.translate(x,y);if(key==='coast'){c.fillStyle='#d5c18a';c.beginPath();c.arc(0,4,r+13,0,Math.PI*2);c.fill();}c.fillStyle='#07121e35';c.beginPath();c.arc(5,8,r,0,Math.PI*2);c.fill();
 if(key==='forest'||key==='coast'){
 c.strokeStyle='#846249';c.lineWidth=5;c.beginPath();c.moveTo(0,12);c.lineTo(0,-9);c.stroke();
 if(key==='coast'){for(let k=0;k<7;k++){c.rotate(Math.PI*2/7);c.fillStyle=k%2?'#65a76a':'#a9c679';c.beginPath();c.moveTo(0,-5);c.lineTo(-6,-r);c.lineTo(2,-r-12);c.lineTo(7,-r/2);c.closePath();c.fill();}}
 else for(let j=0;j<4;j++){c.fillStyle=['#123c32','#246347','#388256','#60a464'][j];c.beginPath();c.arc(j%2*9-4,-j*5,r-j*3,0,Math.PI*2);c.fill();}
 }else if(key==='desert'){
 c.fillStyle='#9c663f';c.beginPath();c.moveTo(-r,r/2);c.lineTo(-r/2,-r);c.lineTo(r/2,-r*.75);c.lineTo(r,r/2);c.closePath();c.fill();c.fillStyle='#e3ba79';c.beginPath();c.moveTo(-r/2,-r);c.lineTo(r/2,-r*.75);c.lineTo(0,r/2);c.closePath();c.fill();
 }else{
 const h=15+n%35;c.fillStyle=key==='harbor'?'#2f5c79':'#292a46';c.fillRect(-r,-h,r*2,h+10);c.fillStyle=key==='harbor'?'#6290a7':'#9e77d4';c.fillRect(-r,-h,r*2,4);c.fillStyle=key==='harbor'?'#abcbd27a':'#e3a0fc';for(let yy=-h+9;yy<4;yy+=8)for(let xx=-r+4;xx<r-3;xx+=8)c.fillRect(xx,yy,3,3);
 }c.restore();
 }
}
