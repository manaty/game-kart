export function mergeTankLayout(previous,next){
  const game=next.party?.tanks,old=previous?.party?.tanks;
  if(game && !game.walls && old?.walls && previous.party.id===next.party.id && old.round===game.round && old.layoutRevision===game.layoutRevision){
    return {...next,party:{...next.party,tanks:{...game,walls:old.walls}}};
  }
  return next;
}

export class TankFrames {
  constructor(){this.reset();}
  reset(){this.previous=null;this.current=null;this.received=0;this.duration=50;this.key='';}
  push(game,key,at){
    if(!game)return;
    if(this.key!==key){this.reset();this.key=key;}
    if(this.current?.sampleTime===game.sampleTime){this.current=game;return;}
    this.previous=this.current;
    this.duration=this.previous?Math.max(16,Math.min(100,game.sampleTime-this.previous.sampleTime)):50;
    this.current=game;this.received=at;
  }
  sample(at){
    const current=this.current,previous=this.previous;
    if(!current||!previous)return current;
    const t=Math.max(0,Math.min(1,(at-this.received)/this.duration));
    if(t>=1)return current;
    const blend=(now,before,angle=false)=>{
      if(!before || before.alive!==now.alive || Math.hypot(now.x-before.x,now.y-before.y)>80)return now;
      const result={...now,x:before.x+(now.x-before.x)*t,y:before.y+(now.y-before.y)*t};
      if(angle)result.angle=before.angle+Math.atan2(Math.sin(now.angle-before.angle),Math.cos(now.angle-before.angle))*t;
      return result;
    };
    return {...current,tanks:current.tanks.map(tank=>blend(tank,previous.tanks.find(t=>t.id===tank.id),true)),bullets:current.bullets.map(bullet=>blend(bullet,previous.bullets.find(b=>b.id===bullet.id)))};
  }
}
