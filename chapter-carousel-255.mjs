/* AnatomIQ 2.2.55 — experimental directional chapter carousel.
   Only 2D chapter snapshots move; WebGL geometry, camera, labels,
   published lesson data and the 2.2.38 occlusion BVH are untouched. */
export const CAROUSEL_MS = 680; // ANATOMIQ_CAROUSEL_SPRING_259
const easeInOut = value => {
  const x = Math.max(0, Math.min(1, value));
  // ANATOMIQ_INLINE_LABELS_EASE_261: exactly matches live model translation.
  return 1 - Math.pow(1-x, 3);
};

/** Numeric chapter order, with explicit wrap-around behavior. */
export function chapterSlideDirection(fromIndex,toIndex,total){
  if(!Number.isInteger(fromIndex)||!Number.isInteger(toIndex)||fromIndex===toIndex)return 0;
  if(total>1 && fromIndex===total-1 && toIndex===0)return 1;
  if(total>1 && fromIndex===0 && toIndex===total-1)return -1;
  return toIndex>fromIndex?1:-1;
}

function transparentOrDark(stage){
  const style=window.getComputedStyle(stage);
  const parent=stage.parentElement && window.getComputedStyle(stage.parentElement);
  const bg=style.backgroundColor;
  const color=bg && bg!=='transparent' && !/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(bg)
    ? bg : parent?.backgroundColor;
  const backgroundColor=color && color!=='transparent' && !/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(color) ? color : '#142e38';
  const image=style.backgroundImage!=='none' && style.backgroundImage ? style.backgroundImage : 'none';
  return {backgroundColor,backgroundImage:image};
}

/** Capture the model immediately after a render; use an image during animation. */
function snapshot(canvas){
  try{
    if(!canvas||!canvas.width||!canvas.height)return null;
    const data=canvas.toDataURL('image/png');
    return data && data.startsWith('data:image/png') ? data : null;
  }catch(error){
    console.warn('AnatomIQ chapter carousel: could not capture WebGL frame',error);
    return null;
  }
}

/** Offsets preserve the exact placement of the underlying Three.js canvas. */
function imagePanel(stage,stageBounds,canvas,bg,src){
  const pane=document.createElement('div');
  pane.className='anat255-carousel-panel';
  Object.assign(pane.style,{
    position:'absolute',inset:'0',overflow:'hidden',
    backgroundColor:bg.backgroundColor,backgroundImage:bg.backgroundImage,
    backgroundSize:window.getComputedStyle(stage).backgroundSize,
    backgroundPosition:window.getComputedStyle(stage).backgroundPosition,
    willChange:'transform',backfaceVisibility:'hidden',
  });
  const bounds=canvas.getBoundingClientRect();
  const image=document.createElement('img');
  image.alt='';image.setAttribute('aria-hidden','true');image.draggable=false;
  image.src=src;
  Object.assign(image.style,{
    position:'absolute',
    left:`${bounds.left-stageBounds.left}px`,top:`${bounds.top-stageBounds.top}px`,
    width:`${bounds.width}px`,height:`${bounds.height}px`,
    maxWidth:'none',maxHeight:'none',display:'block',objectFit:'fill',
    pointerEvents:'none',userSelect:'none'
  });
  pane.append(image);
  return pane;
}

/**
 * A one-shot 2D overlay. Capture fromScene before applyScene(), call play()
 * after the new chapter has rendered. No models or existing nodes move.
 */
export function createChapterCarousel(stage,canvas,direction,options={}){
  if(!stage || !canvas || (direction!==1 && direction!==-1))return null;
  const bounds=stage.getBoundingClientRect();
  if(bounds.width<12||bounds.height<12)return null;
  const outgoingImage=snapshot(canvas);
  if(!outgoingImage)return null;
  const duration=Number.isFinite(options.durationMs) && options.durationMs>=0 ? options.durationMs : CAROUSEL_MS;
  const bg=transparentOrDark(stage);
  let disposed=false;
  let overlay=document.createElement('div');
  overlay.className='anat255-carousel-overlay';
  overlay.setAttribute('aria-hidden','true');
  Object.assign(overlay.style,{
    position:'absolute',inset:'0',width:'100%',height:'100%',
    overflow:'hidden',zIndex:'2147480000',pointerEvents:'auto',
    contain:'layout paint',isolation:'isolate'
  });
  const outgoing=imagePanel(stage,bounds,canvas,bg,outgoingImage);
  overlay.append(outgoing);
  // Freeze the outgoing view immediately, before an asynchronous chapter load.
  // The slide does not start until the incoming scene has fully rendered.
  stage.append(overlay);
  const remove=()=>{disposed=true;overlay?.remove();overlay=null;};
  return {
    async play(incomingCanvas=canvas){
      if(disposed)return;
      const incomingImage=snapshot(incomingCanvas);
      if(!incomingImage){remove();return;}
      const stageBounds=stage.getBoundingClientRect();
      const width=stageBounds.width;
      if(width<12){remove();return;}
      const incoming=imagePanel(stage,stageBounds,incomingCanvas,bg,incomingImage);
      overlay.append(incoming);
      // No state change until both frames are ready; if the page is hidden,
      // do not wait on a paused animation clock.
      const translate=(el,x)=>{el.style.transform=`translate3d(${x}px,0,0)`;};
      translate(outgoing,0);translate(incoming,direction*width);
      try{
        if(document.hidden||duration===0){translate(outgoing,-direction*width);translate(incoming,0);return;}
        await new Promise(resolve=>{
          let started=null;
          const frame=(now)=>{
            if(disposed){resolve();return;}
            if(document.hidden){translate(outgoing,-direction*width);translate(incoming,0);resolve();return;}
            if(started===null)started=now;
            const t=easeInOut(Math.min(1,(now-started)/duration));
            translate(outgoing,-direction*width*t);
            translate(incoming,direction*width*(1-t));
            if(t>=1){resolve();return;}
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        });
      }finally{remove();}
    },
    remove,
    get element(){return overlay;},
  };
}
