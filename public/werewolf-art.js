const drawings={
 wolf:'<path d="M28 72 24 25 47 40 60 33 73 40 96 25 92 72 75 92 60 108 45 92Z"/><path d="M27 28 40 57 30 69M93 28 80 57 90 69M39 64 50 69 43 73M81 64 70 69 77 73M51 87 60 93 69 87M60 94V106"/>',
 villager:'<path d="M22 63 60 28 98 63M32 58V100H88V58M52 100V73H69V100M39 65H44V77H39ZM76 65H81V77H76ZM46 40V25H35V50"/><path d="M20 105H100M25 108H95"/>',
 seer:'<circle cx="60" cy="60" r="30"/><path d="M35 63Q60 40 85 63Q60 85 35 63ZM42 94 34 105H86L78 94M38 108H82M29 29 22 22M60 20V10M91 29 98 22"/><circle cx="60" cy="63" r="8"/>',
 witch:'<path d="M49 18H71V28L68 29V51Q92 62 94 82Q95 104 60 106Q25 104 26 82Q28 62 52 51V29L49 28ZM29 78Q44 69 60 78Q76 87 91 78"/><circle cx="47" cy="90" r="3"/><circle cx="70" cy="89" r="4"/><path d="M84 33V47M77 40H91M34 24V34M29 29H39M49 18H71"/>',
 hunter:'<path d="M24 29Q109 25 95 104M28 30 92 101M21 98 89 27M76 27H89V41M21 98 26 82M21 98 37 93"/><path d="M34 43Q76 38 80 81M24 29 34 43M80 81 95 104"/>',
 hidden:'<path d="M60 23 68 48 93 56 68 64 60 89 52 64 27 56 52 48ZM23 24V38M16 31H30M95 84V98M88 91H102"/><circle cx="60" cy="56" r="35" stroke-dasharray="2 6"/>'
};
export function wolfRoleArt(role){return `<svg class="wolf-card-art" viewBox="0 0 120 128" aria-hidden="true"><circle cx="60" cy="64" r="52" fill="none" stroke="currentColor" opacity=".2"/><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${drawings[role]||drawings.hidden}</g></svg>`;}
export function createWolfScene(){
 const node=document.createElement('div');node.className='wolf-scene';node.setAttribute('aria-hidden','true');
 node.innerHTML='<img class="wolf-photo wolf-photo-day" src="assets/scenes/werewolf-day.png" alt=""><img class="wolf-photo wolf-photo-night" src="assets/scenes/werewolf-night.png" alt=""><div class="wolf-scene-shade"></div><div class="wolf-mist"></div><div class="wolf-stars">'+Array.from({length:12},()=>'<i></i>').join('')+'</div><div class="wolf-birds"><svg viewBox="0 0 100 30"><path d="M0 15Q12 3 24 15Q35 5 45 15M45 25Q56 13 68 25Q79 15 91 25" fill="none" stroke="currentColor" stroke-width="2"/></svg></div>';
 return node;
}
