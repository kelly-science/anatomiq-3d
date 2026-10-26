// ANATOMIQ_FADE_DETAILS_239_20261026: Fade resides in Structure Details, not the View menu.
/* AnatomIQ 2.2.16c — single-source teacher View menu.
   All actions delegate to existing UI buttons; no shadow visibility state. */
const SYSTEM_NAMES = Object.freeze({
  skeletal:'Skeletal',connective:'Connective',muscular:'Muscular',
  cardiovascular:'Cardiovascular',respiratory:'Respiratory',digestive:'Digestive',
  nervous:'Nervous',urinary:'Urinary',lymphatic:'Lymphatic'
});
const SYSTEM_ORDER=['skeletal','connective','muscular','cardiovascular','respiratory','digestive','nervous','urinary','lymphatic'];

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const option=(label,attrs)=>{
  const b=el('button','menu-item view-special-option',label);b.type='button';b.setAttribute('role','menuitem');
  for(const [k,v] of Object.entries(attrs))b.dataset[k]=v;
  return b;
};
function availablePresets(selector,kind){
  return [...document.querySelectorAll(selector)].filter(b=>!b.disabled).map(b=>({
    label:b.textContent.trim(), attrs:{viewProxy:kind+':'+b.dataset[kind+'Preset']}
  }));
}
function specialsFor(system){
  if(system==='skeletal')return [
    {label:'Skull Only',attrs:{anatomyPreset:'skull'}},
    {label:'Full Skeleton',attrs:{anatomyPreset:'skeleton'}},
    {label:'Axial Skeleton',attrs:{viewSkeleton:'axial'}},
    {label:'Appendicular Skeleton',attrs:{viewSkeleton:'appendicular'}},
    {label:'Show Teeth',attrs:{viewTeeth:'toggle'}}
  ];
  if(system==='connective')return availablePresets('[data-connective-preset]','connective');
  if(system==='cardiovascular')return availablePresets('[data-cardio-preset]','cardio');
  if(system==='respiratory')return availablePresets('[data-respiratory-preset]','respiratory');
  if(system==='nervous')return document.getElementById('eye-focus')?[{label:'Focus on Eyes',attrs:{viewProxy:'eye:focus'}}]:[];
  if(system==='muscular')return [
    {label:'Superficial Muscles',attrs:{viewProxy:'muscle:superficial'}},
    {label:'Deep Muscles',attrs:{viewProxy:'muscle:deep'}}
  ];
  return [];
}
function buildMenu(root){
  const openSystems=new Set([...root.querySelectorAll('.view-system-group[data-open="true"]')].map(n=>n.dataset.system));
  root.replaceChildren();
  const heading=el('div','view-menu-caption','ANATOMICAL SYSTEMS');root.append(heading);
  for(const name of SYSTEM_ORDER){
    const tab=document.querySelector('.mode-tab[data-system="'+name+'"]');
    if(!tab)continue; // Systems are discovered from actual installed controls.
    const group=el('div','view-system-group');group.dataset.system=name;
    const head=el('div','view-system-head');
    const active=tab.getAttribute('aria-pressed')==='true';
    const systemButton=option((active?'✓  ':'     ')+(SYSTEM_NAMES[name]||name),{viewSystem:name});
    systemButton.classList.add('view-system-button');systemButton.disabled=tab.disabled;
    systemButton.setAttribute('aria-checked',String(active));
    head.append(systemButton);
    const specials=specialsFor(name);
    if(specials.length){
      const toggle=el('button','view-submenu-toggle','›');toggle.type='button';
      toggle.setAttribute('aria-label',`${SYSTEM_NAMES[name]} special views`);
      toggle.dataset.viewExpand=name;
      const expanded=openSystems.has(name);
      toggle.setAttribute('aria-expanded',String(expanded));
      toggle.textContent=expanded?'⌄':'›';
      head.append(toggle);
      const sub=el('div','view-submenu');sub.id='view-submenu-'+name;
      sub.hidden=!expanded;group.dataset.open=String(expanded);
      toggle.setAttribute('aria-controls',sub.id);
      for(const preset of specials){
        const item=option(preset.label,preset.attrs);
        if(preset.attrs.viewTeeth){
          const checked=Boolean(document.getElementById('toggle-teeth')?.checked);
          item.textContent=(checked?'✓  ':'     ')+preset.label;
          item.setAttribute('aria-checked',String(checked));
          item.setAttribute('role','menuitemcheckbox');
        }
        sub.append(item);
      }
      group.append(head,sub);
    }else group.append(head);
    root.append(group);
  }
  root.append(el('div','menu-separator'));
  root.append(el('div','view-menu-caption','CAMERA'));
  for(const [name,value] of [['Front','front'],['Back','back'],['Left','left'],['Right','right']])root.append(option(name,{menuView:value}));
  root.append(option('Reset Camera',{menuClick:'reset-camera'}));
}
function activateProxy(code){
  const [kind,preset]=code.split(':',2);
  if(kind==='eye'){document.getElementById('eye-focus')?.click();return;}
  if(kind==='muscle'){
    const check=document.getElementById(preset==='deep'?'system-deep':'system-superficial');
    if(check&&!check.checked)check.click();return;
  }
  const selector=kind==='connective'?'[data-connective-preset]':kind==='cardio'?'[data-cardio-preset]':kind==='respiratory'?'[data-respiratory-preset]':null;
  if(!selector)return;
  const key=kind+'Preset';
  const control=[...document.querySelectorAll(selector)].find(b=>b.dataset[key]===preset && !b.disabled);
  control?.click();
}
export function installViewMenuPolish(){
  const root=document.getElementById('menu-view');
  if(!root||root.dataset.viewPolishInstalled==='true')return false;
  root.dataset.viewPolishInstalled='true';
  buildMenu(root);
  root.addEventListener('click',event=>{
    const expansion=event.target.closest('[data-view-expand]');
    if(expansion){
      event.preventDefault();event.stopPropagation();
      const group=expansion.closest('.view-system-group');
      const sub=group?.querySelector('.view-submenu');if(!sub)return;
      sub.hidden=!sub.hidden;group.dataset.open=String(!sub.hidden);
      expansion.setAttribute('aria-expanded',String(!sub.hidden));
      expansion.textContent=sub.hidden?'›':'⌄';return;
    }
    const action=event.target.closest('.menu-item');
    if(!action)return;
    if(action.dataset.viewSystem){
      const tab=document.querySelector('.mode-tab[data-system="'+action.dataset.viewSystem+'"]');
      if(tab&&!tab.disabled)tab.click();
    }
    if(action.dataset.viewSkeleton){
      window.dispatchEvent(new CustomEvent('anatomiq:skeletal-preset',{detail:{division:action.dataset.viewSkeleton}}));
    }
    if(action.dataset.viewTeeth){
      // Keep one canonical teeth setting; the original input dispatches its own change event.
      document.getElementById('toggle-teeth')?.click();
    }
    if(action.dataset.viewProxy)activateProxy(action.dataset.viewProxy);
  },true);
  const trigger=root.closest('.menu-group')?.querySelector('.menu-trigger');
  trigger?.addEventListener('click',()=>buildMenu(root),true);
  root.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'&&event.target.matches('.view-submenu-toggle')){
      event.preventDefault();const group=event.target.closest('.view-system-group');
      if(group?.querySelector('.view-submenu')?.hidden)event.target.click();
      group?.querySelector('.view-submenu .menu-item:not([disabled])')?.focus();
    }
    if(event.key==='ArrowLeft'&&event.target.closest('.view-submenu')){
      event.preventDefault();const group=event.target.closest('.view-system-group');
      if(group&&!group.querySelector('.view-submenu').hidden)group.querySelector('.view-submenu-toggle').click();
      group?.querySelector('.view-system-button')?.focus();
    }
  },true);
  return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installViewMenuPolish,{once:true});
else installViewMenuPolish();
