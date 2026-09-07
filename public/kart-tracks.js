export const KART_TRACKS=[
  {key:'coast',ground:'#154d58',road:'#324d59',accent:'#76edee',points:[[250,120],[700,120],[825,220],[825,440],[700,525],[250,525],[135,440],[135,220]]},
  {key:'desert',ground:'#795237',road:'#453c41',accent:'#ffd17d',points:[[210,115],[560,100],[800,170],[820,370],[680,515],[460,440],[260,530],[120,380],[130,220]]},
  {key:'harbor',ground:'#203b5b',road:'#354653',accent:'#88c4ff',points:[[170,110],[780,110],[825,245],[555,250],[535,440],[785,455],[770,550],[175,550],[120,375]]},
  {key:'forest',ground:'#254b3d',road:'#3c4448',accent:'#b6ed8b',points:[[150,120],[450,110],[535,245],[790,155],[825,410],[650,535],[470,420],[270,520],[120,375]]},
  {key:'neon',ground:'#251f42',road:'#3d3658',accent:'#f298ff',points:[[240,105],[665,105],[820,235],[715,340],[825,500],[560,540],[420,390],[180,520],[120,260]]}
];
export const ROAD_RADIUS=43;
export function trackPosition(points,x,y){
  let best={distance:Infinity,progress:0},length=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],segment=Math.hypot(dx,dy),fraction=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(segment*segment))),px=a[0]+dx*fraction,py=a[1]+dy*fraction,distance=Math.hypot(x-px,y-py);
    if(distance<best.distance)best={distance,progress:length+fraction*segment};length+=segment;
  }
  return {...best,length};
}

export function trackFeatures(config){
 const at=(segment,f=.5)=>{const a=config.points[segment%config.points.length],b=config.points[(segment+1)%config.points.length];return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};};
 return {oil:[{...at(2,.35),id:0},{...at(5,.7),id:1}],boost:[{...at(0,.6),id:0},{...at(4,.45),id:1}],bridge:{...at(3),length:120,width:ROAD_RADIUS*2+14}};
}
