/* AnatomIQ 2.2.33 — independent panel chevrons and chapter-scroll enhancement.
   No changes to renderer, chapter state, permissions, or model data. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  function init(){
    const workspace=document.querySelector('.workspace');
    const left=$('left-sidebar'),right=$('info-sidebar');
    const tabs=$('chapter-tabs'),detail=$('selection-content'),name=$('selected-name');
    if(!workspace||!left||!right||!tabs||!detail||!name)return;
    if($('anat-toggle-explorer')||$('anat-toggle-details'))return;
    const body=document.body;
    const mq=window.matchMedia('(max-width: 1440px)');
    const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const sizes={left:280,right:284};
    // Capture the current application's true desktop widths before overriding its grid.
    if(!mq.matches){
      sizes.left=Math.max(200,Math.round(left.getBoundingClientRect().width)||280);
      sizes.right=Math.max(200,Math.round(right.getBoundingClientRect().width)||284);
    }
    workspace.style.setProperty('--anat-left-pane',`${sizes.left}px`);
    workspace.style.setProperty('--anat-right-pane',`${sizes.right}px`);
    const state={left:!mq.matches,right:!mq.matches,compact:mq.matches};
    const makeToggle=(id,controls)=>{
      const b=document.createElement('button');b.type='button';b.id=id;
      b.className='anat-panel-handle';b.setAttribute('aria-controls',controls);
      return b;
    };
    const leftButton=makeToggle('anat-toggle-explorer','left-sidebar');
    const rightButton=makeToggle('anat-toggle-details','info-sidebar');
    workspace.append(leftButton,rightButton);
    workspace.classList.add('anat-panels-enabled');
    body.classList.add('anat-responsive-panels');
    const permitted=side=>{
      if(!body.classList.contains('student-mode'))return true;
      return side==='left'?(body.classList.contains('student-tree')||body.classList.contains('student-search'))
        :body.classList.contains('student-names');
    };
    const requestRenderResize=()=>{
      requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
      window.setTimeout(()=>window.dispatchEvent(new Event('resize')),230);
    };
    const redraw=()=>{
      for(const [side,panel,button] of [['left',left,leftButton],['right',right,rightButton]]){
        const visible=permitted(side);
        const open=visible&&state[side];
        body.classList.toggle(side==='left'?'anat-left-closed':'anat-right-closed',!open);
        // Preserve compatibility with app.js's existing mobile drawer state.
        // Fullscreen Student View relocates details into the viewer and owns its floating toggle.
        // Never override that independent fullscreen presentation.
        if(side==='right'&&panel.classList.contains('anat-floating-info')){
          // The fullscreen drawer has its own visibility control and must remain interactive.
          panel.inert=false;
        }else{
          panel.classList.toggle('open',open);
          panel.inert=!open;
        }
        button.hidden=!visible;
        button.setAttribute('aria-expanded',String(open));
        const action=open?'Collapse':'Expand';
        button.title=`${action} ${side==='left'?'Explorer':'Structure Details'}`;
        button.setAttribute('aria-label',button.title);
        button.textContent=side==='left'?(open?'‹':'›'):(open?'›':'‹');
      }
      workspace.style.setProperty('--anat-left-track',state.left&&permitted('left')?`${sizes.left}px`:'0px');
      workspace.style.setProperty('--anat-right-track',state.right&&permitted('right')?`${sizes.right}px`:'0px');
    };
    function change(side,open){
      if(open&&!permitted(side))return;
      if(state[side]===open)return;
      state[side]=open;
      // Compact drawers cannot obscure each other; the last opened wins.
      if(state.compact && open)state[side==='left'?'right':'left']=false;
      redraw();requestRenderResize();
    }
    leftButton.addEventListener('click',()=>change('left',!state.left));
    rightButton.addEventListener('click',()=>change('right',!state.right));
    const syncBreakpoint=()=>{
      if(mq.matches===state.compact)return;
      state.compact=mq.matches;
      state.left=!state.compact;state.right=!state.compact;
      redraw();requestRenderResize();
    };
    if(typeof mq.addEventListener==='function')mq.addEventListener('change',syncBreakpoint);
    else mq.addListener(syncBreakpoint);
    // Selection is managed exclusively by app.js. Observe its public details UI;
    // do not intercept canvas clicks, mutate selected structures, or bypass permissions.
    const selectionChanged=()=>{
      if(detail.hidden||!name.textContent.trim()||name.textContent.trim()==='—'||!permitted('right'))return;
      change('right',true);
    };
    new MutationObserver(selectionChanged).observe(detail,{attributes:true,attributeFilter:['hidden']});
    new MutationObserver(selectionChanged).observe(name,{subtree:true,childList:true,characterData:true});
    // Student permissions are applied asynchronously as the published lesson loads.
    new MutationObserver(()=>{
      if(!permitted('left'))state.left=false;
      if(!permitted('right'))state.right=false;
      redraw();
    }).observe(body,{attributes:true,attributeFilter:['class']});
    // Existing Cmd/Ctrl+F focuses the Explorer search; make its panel accessible.
    window.addEventListener('keydown',event=>{
      if((event.metaKey||event.ctrlKey)&&!event.altKey&&event.key.toLowerCase()==='f'&&permitted('left'))change('left',true);
    },true);
    const alignActive=()=>{
      const active=tabs.querySelector('.chapter-tab.active,[aria-current="step"]');
      if(!active||tabs.clientWidth===0)return;
      const box=tabs.getBoundingClientRect(),a=active.getBoundingClientRect();
      const desired=tabs.scrollLeft+a.left-box.left-(tabs.clientWidth-a.width)/2;
      tabs.scrollTo({left:Math.max(0,desired),behavior:prefersReduced.matches?'instant':'smooth'});
    };
    let chapterFrame=0;
    function chapterChanged(){cancelAnimationFrame(chapterFrame);chapterFrame=requestAnimationFrame(alignActive);}
    new MutationObserver(chapterChanged).observe(tabs,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-current']});
    // Make ordinary mouse-wheel motion scroll the strip horizontally, like a toolbar.
    tabs.addEventListener('wheel',event=>{
      if(event.ctrlKey||event.metaKey||event.altKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
      if(tabs.scrollWidth<=tabs.clientWidth+2)return;
      const dx=event.deltaY;
      const atLeft=tabs.scrollLeft<=1,atRight=tabs.scrollLeft>=tabs.scrollWidth-tabs.clientWidth-1;
      if((dx<0&&atLeft)||(dx>0&&atRight))return;
      event.preventDefault();tabs.scrollLeft+=dx;
    },{passive:false});
    redraw();chapterChanged();
    // Keep event available to small diagnostic / regression scripts.
    window.__AnatomIQResponsivePanels={toggle:change,status:()=>({...state,leftVisible:permitted('left'),rightVisible:permitted('right')})};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
