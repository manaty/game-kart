const clamp=n=>Math.max(-1,Math.min(1,n));
export function kartStickValue(axis,x,y,rect){const radius=Math.max(1,(axis==='steer'?rect.width:rect.height)/2-36),raw=axis==='steer'?(x-rect.left-rect.width/2)/radius:-(y-rect.top-rect.height/2)/radius,value=clamp(raw);return {value:Math.abs(value)<.12?0:value,offset:value*radius};}
export function kartCommand(sticks,keys,enabled=true){return enabled?{steer:sticks.steer||Number(keys.has('right'))-Number(keys.has('left')),throttle:keys.has('fire')?-1:sticks.throttle||Number(keys.has('forward'))-Number(keys.has('back'))}:{steer:0,throttle:0};}
