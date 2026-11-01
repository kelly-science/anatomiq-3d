// AnatomIQ 2.2.86: Explore activity rotation progress (no Three.js dependency).
// Free Rotate retains the original cumulative-travel meter in guided-lessons-269j.mjs.
export const ROTATION_DIRECTIONS=Object.freeze(['free','left','right','up','down']);
export const DIRECTION_LABELS=Object.freeze({free:'Free Rotate',left:'Rotate left',right:'Rotate right',up:'Rotate up',down:'Rotate down'});
export function rotationDirection(activity){
  return ROTATION_DIRECTIONS.includes(activity?.rotationDirection)?activity.rotationDirection:'free';
}
export function rotationDirectionLabel(activity){
  return DIRECTION_LABELS[rotationDirection(activity)];
}
export function directionMaxDegrees(direction){
  // OrbitControls clamps polar elevation, so large vertical requirements can be unreachable.
  return ['up','down'].includes(direction)?90:360;
}
const radToDeg=180/Math.PI;
function cameraAngles(camera,target){
  if(!camera?.position || !target)return null;
  const x=camera.position.x-target.x,y=camera.position.y-target.y,z=camera.position.z-target.z;
  const r=Math.hypot(x,y,z);
  if(!Number.isFinite(r)||r<1e-8)return null;
  return {azimuth:Math.atan2(x,z)*radToDeg, polar:Math.atan2(Math.hypot(x,z),y)*radToDeg};
}
function wrappedDelta(current,previous){
  let delta=(current-previous+540)%360-180;
  if(delta===-180 && current-previous>0)delta=180;
  return delta;
}
export function createDirectedRotationMeter(required=90,direction='left',initialSigned=0){
  if(!Number.isFinite(required)||required<=0||required>directionMaxDegrees(direction)||!ROTATION_DIRECTIONS.includes(direction)||direction==='free')
    throw Error('Invalid directional rotation requirement.');
  // Signed net angular movement relative to the starting camera position.
  // Reversing cancels previous progress; micro-movements cannot add up.
  let signed=Number.isFinite(initialSigned)?Math.max(-required,Math.min(required,initialSigned)):0;
  let active=false,last=null;
  let attained=signed>=required-1e-6;
  const horizontal=direction==='left'||direction==='right';
  // OrbitControls rotates the *camera* opposite the horizontal pointer drag.
  // Drag left => azimuth increases; drag up => polar angle increases.
  const sign=(direction==='left'||direction==='up')?1:-1;
  return {
    begin(camera,target){active=true;last=cameraAngles(camera,target);},
    change(camera,target){
      if(!active||attained)return this.value;
      const now=cameraAngles(camera,target);if(!now)return this.value;
      if(last){
        const delta=horizontal?wrappedDelta(now.azimuth,last.azimuth):now.polar-last.polar;
        // Do not award camera teleports/reset movements or numerical noise.
        if(Number.isFinite(delta)&&Math.abs(delta)>=0.015&&Math.abs(delta)<=35){
          signed=Math.max(-required,Math.min(required,signed+delta*sign));
          if(signed>=required-1e-6){signed=required;attained=true;}
        }
      }
      last=now;
      return this.value;
    },
    end(){active=false;last=null;},
    get value(){return attained?required:Math.max(0,signed);},
    get signed(){return signed;},
    get unlocked(){return attained;},
    get active(){return active;}
  };
}
