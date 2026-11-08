/** AnatomIQ Schoology preview, publication-only: no student or grading path. */
export const ANATOMIQ_EMBED_PREVIEW_373='ANATOMIQ_SCHOOLOGY_PREVIEW_373';

export function captureSchoologyPreview373({renderer,scene,camera,stage}){
  if(!renderer?.domElement||!scene||!camera||!stage)throw new Error('3D viewer is unavailable.');
  const source=renderer.domElement;
  if(source.width<10||source.height<10)throw new Error('3D model is not ready for preview capture.');
  // Exactly one fresh draw: WebGL contexts typically do not preserve the previous frame.
  renderer.render(scene,camera);
  const canvas=document.createElement('canvas');
  canvas.width=640;canvas.height=360;
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Canvas preview is not supported.');
  let bg='#12232b';
  try{const value=getComputedStyle(stage).backgroundColor;if(value&&!/^rgba?\(0,\s*0,\s*0,\s*0\)/.test(value)&&value!=='transparent')bg=value;}catch{}
  ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height);
  const scale=Math.min(canvas.width/source.width,canvas.height/source.height);
  const w=source.width*scale,h=source.height*scale;
  ctx.drawImage(source,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
  // No HTML labels, titles or assessment answer overlays are captured.
  const data=canvas.toDataURL('image/jpeg',.77);
  if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data))throw new Error('JPEG thumbnail encoding failed.');
  if(data.length>550000)throw new Error('Thumbnail exceeds the 400 KB budget.');
  return data;
}

export function schoologyPreviewPath373(slug){
  if(!/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/.test(String(slug))||slug.length>62)
    throw new Error('Invalid lesson slug for preview.');
  return `lessons/previews/${slug}.jpg`;
}
