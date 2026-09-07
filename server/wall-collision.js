// Layouts are replaced when a wall rotates. Index their nearby segments once.
const layouts=new WeakMap(),CELL=80,PADDING=20;
export function nearWall(x,y,clearance,walls){
  let layout=layouts.get(walls);
  if(!layout||layout.length!==walls.length){
    const bins=new Map(),bounds=walls.map(([a,b,c,d])=>[Math.min(a,c),Math.min(b,d),Math.max(a,c),Math.max(b,d)]);
    for(const box of bounds)for(let col=Math.floor((box[0]-PADDING)/CELL);col<=Math.floor((box[2]+PADDING)/CELL);col++)for(let row=Math.floor((box[1]-PADDING)/CELL);row<=Math.floor((box[3]+PADDING)/CELL);row++){
      const key=col+':'+row;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(box);
    }
    layout={bins,bounds,length:walls.length};layouts.set(walls,layout);
  }
  const candidates=clearance<=PADDING?layout.bins.get(Math.floor(x/CELL)+':'+Math.floor(y/CELL))||[]:layout.bounds;
  const squared=clearance*clearance;
  for(const [left,top,right,bottom] of candidates){const dx=x-Math.max(left,Math.min(right,x)),dy=y-Math.max(top,Math.min(bottom,y));if(dx*dx+dy*dy<squared)return true;}
  return false;
}
