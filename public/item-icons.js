// Code-drawn icons work offline, including on TVs without emoji fonts.
export const iconPaths={
  mine:['M5 16 L5 12 L8 9 L16 9 L19 12 L19 16 Z','M12 9 L12 4 M9 4 L15 4 M3 19 L21 19'],
  burst:['M4 17 L4 8 L7 4 L10 8 L10 17 Z','M14 20 L14 11 L17 7 L20 11 L20 20 Z','M4 13 L10 13 M14 16 L20 16'],
  missile:['M8 15 C6 9 12 3 21 3 C21 12 15 18 9 16 Z','M8 10 L3 13 L8 15 M14 16 L11 21 L9 16 M6 18 L3 21','M14 8 L16 10'],
  laser:['M2 15 L7 10 L12 15 L7 20 Z','M10 12 L21 1 M13 13 L22 4 M18 8 L21 11 M16 5 L13 2'],
  pickaxe:['M5 3 C13 1 21 8 21 15 L15 9 L9 7 Z','M13 7 L3 20 L5 22 L16 10']
};
export function itemIcon(type){return `<svg viewBox="0 0 24 24" aria-hidden="true" class="item-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${(iconPaths[type]||[]).map(d=>`<path d="${d}"/>`).join('')}</svg>`;}
