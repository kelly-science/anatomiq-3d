/* ANATOMIQ_RECENT_LESSONS_281
   A tiny synchronous bootstrap, intentionally before app.js determines teacherMode.
   Only this device's successfully opened student routes are remembered.
   Does not contain student responses or alter scene/project data. */
(function(root){
  'use strict';
  const KEY='anatomiq-recent-student-routes-v1';
  const DAYS=7, MAX=3, AGE=DAYS*24*60*60*1000;
  const now=()=>Date.now();
  const storage=()=>{try{return root.localStorage;}catch{return null;}};
  function valid(route){
    if(typeof route!=='string'||route.length>12000)return false;
    if(/^#lesson=[a-z0-9-]+\/[a-z0-9_.-]+\/[a-z0-9-]+@[a-z0-9._%/-]+$/i.test(route) &&
       !route.includes('..') && route.length<=480)return true;
    return /^#scene=[A-Za-z0-9_.~!$&'()*+,;=:%-]+$/.test(route) && route.length<=12000;
  }
  function read(){
    let list=[];
    try{const parsed=JSON.parse(storage()?.getItem(KEY)||'[]');if(Array.isArray(parsed))list=parsed;}catch{}
    const seen=new Set();
    return list.filter(x=>{
      if(!x||!valid(x.route)||!Number.isFinite(x.at)||x.at>now()+60_000||now()-x.at>AGE||seen.has(x.route))return false;
      seen.add(x.route);return true;
    }).slice(0,MAX).map(x=>({route:x.route,title:String(x.title||'Lesson').slice(0,100),at:x.at,ready:!!x.ready,update:!!x.update}));
  }
  function write(list){try{storage()?.setItem(KEY,JSON.stringify(list.slice(0,MAX)));return true;}catch{return false;}}
  function remember(route,title){
    if(!valid(route))return false;
    const previous=read().find(x=>x.route===route);
    const list=read().filter(x=>x.route!==route);
    list.unshift({route,title:String(title||previous?.title||'Lesson').slice(0,100),at:now(),ready:!!previous?.ready,update:!!previous?.update});
    return write(list);
  }
  function markReady(route,ready){
    if(!valid(route))return false;
    const list=read();const item=list.find(x=>x.route===route);
    if(!item)return false;
    item.ready=!!ready;return write(list);
  }
  function markUpdate(route,pending){
    if(!valid(route))return false;
    const list=read();const item=list.find(x=>x.route===route);
    if(!item)return false;
    item.update=!!pending;return write(list);
  }
  function pendingUpdate(route){return !!read().find(x=>x.route===route)?.update;}
  function maybeRestore(){
    try{
      const standAlone=root.navigator?.standalone===true || root.matchMedia?.('(display-mode: standalone)')?.matches;
      if(!standAlone||root.location.hash||root.location.search.includes('embed=1')||new URLSearchParams(root.location.search).has('studio'))return false;
      const latest=read()[0];if(!latest)return false;
      // Replace the URL in-place, without a redirect or network round trip.
      root.history.replaceState(root.history.state,'',root.location.pathname+root.location.search+latest.route);
      return true;
    }catch(error){root.console?.warn?.('[AnatomIQ] Recent lesson restoration unavailable:',error);return false;}
  }
  const api=Object.freeze({remember,markReady,markUpdate,pendingUpdate,list:read,maybeRestore});
  root.AnatomIQRecentLessons281=api;
  maybeRestore();
  if(typeof module==='object' && module?.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
