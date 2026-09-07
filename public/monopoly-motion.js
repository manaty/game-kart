// A signed route preserves backwards Chance moves and explicit jail/GO transfers.
export function monopolyRoute(from,to,events){
 const route=[from];for(const event of events){if(event.type!=='move')continue;const direction=Math.sign(event.amount);for(let n=0;n<Math.abs(event.amount);n++)route.push((route.at(-1)+direction+40)%40);}
 if(route.at(-1)!==to)route.push(to);return route.length>1?route:[from,to];
}
