/* AnatomIQ 2.2.54 — optional chapter iris, adapted from the user's
   B Cell Defender logo iris (powerOff → blackHold → powerOn).
   UI-only: geometry, chapter contents and rendering/occlusion are unchanged. */
export const TRANSITION_KEY = 'anatomiq.chapter.transition.mode';
const NS = 'http://www.w3.org/2000/svg';
const MODES = new Set(['crossfade', 'iris', 'carousel']);
const smoothstep = x => { const p=Math.max(0,Math.min(1,x));return p*p*(3-2*p); };
let fallbackMode='crossfade';
try { const stored=window.localStorage.getItem(TRANSITION_KEY);if(MODES.has(stored))fallbackMode=stored; }catch{}

export function getChapterTransitionMode(){return fallbackMode;}
export function setChapterTransitionMode(mode){
  if(!MODES.has(mode))throw new TypeError('Unsupported chapter transition');
  fallbackMode=mode;
  try{window.localStorage.setItem(TRANSITION_KEY,mode);}catch{}
  document.dispatchEvent(new CustomEvent('anatomiq:chapter-transition',{detail:{mode}}));
  return mode;
}
export function chapterIrisEnabled(){
  return getChapterTransitionMode()==='iris' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function chapterCarouselEnabled(){
  return getChapterTransitionMode()==='carousel' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const svgElement=(tag,attrs={})=>{
  const el=document.createElementNS(NS,tag);
  for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));
  return el;
};
let uniqueId=0;

export function createIrisTransition(stage, options={}){
  const bounds=stage?.getBoundingClientRect();
  if(!bounds || bounds.width<8 || bounds.height<8)return null;
  const w=bounds.width,h=bounds.height;
  const maxRadius=Math.hypot(w/2,h/2)+8;
  const minRadius=Math.max(22,Math.min(30,Math.round(Math.min(w,h)*0.085)));
  const maskId=`anat254-iris-mask-${++uniqueId}`;

  const overlay=document.createElement('div');
  overlay.className='anat254-iris-overlay';
  overlay.setAttribute('aria-hidden','true');
  Object.assign(overlay.style,{
    position:'absolute',inset:'0',width:'100%',height:'100%',
    zIndex:'2147480000',pointerEvents:'auto',overflow:'hidden'
  });
  const svg=svgElement('svg',{viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:'none'});
  Object.assign(svg.style,{width:'100%',height:'100%',display:'block'});
  const defs=svgElement('defs');
  const mask=svgElement('mask',{id:maskId,maskUnits:'userSpaceOnUse',x:0,y:0,width:w,height:h});
  mask.append(svgElement('rect',{x:0,y:0,width:w,height:h,fill:'#ffffff'}));
  const opening=svgElement('circle',{cx:w/2,cy:h/2,r:maxRadius,fill:'#000000'});
  mask.append(opening);defs.append(mask);svg.append(defs);
  svg.append(svgElement('rect',{x:0,y:0,width:w,height:h,fill:'#05080c',mask:`url(#${maskId})`}));
  const glow=svgElement('circle',{cx:w/2,cy:h/2,r:maxRadius,fill:'none',stroke:'#6dd0d2','stroke-width':'3',opacity:0});
  const rim=svgElement('circle',{cx:w/2,cy:h/2,r:maxRadius,fill:'none',stroke:'#ffffff','stroke-width':'1',opacity:0});
  svg.append(glow,rim);overlay.append(svg);

  // An AnatomIQ badge replaces B Cell Defender's B-cell sprite; mask motion is the same.
  const badge=document.createElement('div');
  badge.textContent='A';badge.setAttribute('aria-hidden','true');
  Object.assign(badge.style,{
    position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
    width:`${minRadius*2}px`,height:`${minRadius*2}px`,borderRadius:'50%',
    background:'#397f88',color:'#f5ffff',border:'2px solid #a4e5e6',
    display:'grid',placeItems:'center',font:'700 20px Inter,system-ui,sans-serif',
    boxShadow:'0 0 15px #52bbc866',opacity:'0',pointerEvents:'none'
  });
  overlay.append(badge);stage.append(overlay);
  let disposed=false;
  const closeMs=Number.isFinite(options.closeMs)?options.closeMs:467; // B Cell Defender: 28 frames at 60 FPS
  const holdMs=Number.isFinite(options.holdMs)?options.holdMs:150;  // approx. 10-frame hold
  const openMs=Number.isFinite(options.openMs)?options.openMs:533; // approx. 32 frames
  const set=(radius,p,phase)=>{
    if(disposed)return;
    opening.setAttribute('r',Math.max(0,radius).toFixed(2));
    glow.setAttribute('r',(radius+2).toFixed(2));
    rim.setAttribute('r',radius.toFixed(2));
    const strength=phase==='close'?p:1-p;
    glow.setAttribute('opacity',(0.16*strength).toFixed(3));
    rim.setAttribute('opacity',(0.25*strength).toFixed(3));
    const badgeAlpha=phase==='close'?Math.max(0,Math.min(1,(p-0.58)/0.30)):Math.max(0,1-p*2.2);
    badge.style.opacity=badgeAlpha.toFixed(3);
  };
  function tween(from,to,duration,phase){
    return new Promise(resolve=>{
      if(disposed){resolve();return;}
      if(document.hidden||duration<=0){set(to,1,phase);resolve();return;}
      let start;
      function tick(now){
        if(disposed){resolve();return;}
        if(start===undefined)start=now;
        const fraction=Math.min(1,(now-start)/duration),ease=smoothstep(fraction);
        set(from+(to-from)*ease,fraction,phase);
        if(fraction<1)requestAnimationFrame(tick);else resolve();
      }
      requestAnimationFrame(tick);
    });
  }
  function remove(){if(!disposed){disposed=true;overlay.remove();}}
  return {
    async close(){
      await tween(maxRadius,minRadius,closeMs,'close');
      if(!disposed && holdMs>0 && !document.hidden)await new Promise(resolve=>setTimeout(resolve,holdMs));
      if(!disposed)badge.style.opacity='1';
    },
    async open(){
      try{await tween(minRadius,maxRadius,openMs,'open');}finally{remove();}
    },
    remove,
    element:overlay
  };
}

function makeMenuOptions(menu){
  if(!menu||menu.querySelector('[data-anat254-transition]'))return;
  const rule=document.createElement('div');rule.className='menu-separator';rule.setAttribute('role','separator');
  const header=document.createElement('div');header.className='menu-caption';header.textContent='CHAPTER TRANSITION';
  menu.append(rule,header);
  for(const [mode,title] of [['crossfade','Crossfade'],['iris','Iris (Experimental)'],['carousel','Carousel (Experimental)']]){
    const item=document.createElement('button');item.type='button';item.className='menu-item';item.setAttribute('role','menuitemradio');
    item.dataset.anat254Transition=mode;
    item.addEventListener('click',()=>{
      setChapterTransitionMode(mode);
      const group=menu.closest('.menu-group');
      if(group){group.classList.remove('is-open');const dropdown=group.querySelector('.menu-dropdown');if(dropdown)dropdown.hidden=true;group.querySelector('.menu-trigger')?.setAttribute('aria-expanded','false');}
    });
    item.textContent=title;menu.append(item);
  }
  syncMenuOptions();
}
function syncMenuOptions(){
  const active=getChapterTransitionMode();
  document.querySelectorAll('[data-anat254-transition]').forEach(item=>{
    const checked=item.dataset.anat254Transition===active;
    item.setAttribute('aria-checked',String(checked));
    item.textContent=`${checked?'✓  ':''}${({crossfade:'Crossfade',iris:'Iris (Experimental)',carousel:'Carousel (Experimental)'})[item.dataset.anat254Transition]}`;
  });
}
export function installChapterTransitionMenus(){
  document.addEventListener('anatomiq:chapter-transition',syncMenuOptions);
  const tryInstall=()=>{
    makeMenuOptions(document.getElementById('menu-view'));
    makeMenuOptions(document.getElementById('anat-student-menu-view'));
    return Boolean(document.querySelector('#menu-view [data-anat254-transition]') && document.querySelector('#anat-student-menu-view [data-anat254-transition]'));
  };
  if(tryInstall())return;
  const observer=new MutationObserver(()=>{if(tryInstall())observer.disconnect();});
  observer.observe(document.body,{subtree:true,childList:true});
  setTimeout(()=>observer.disconnect(),12000);
}
