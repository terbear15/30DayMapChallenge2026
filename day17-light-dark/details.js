import * as THREE from './vendor/three.module.js';

// Tile meshes limit the detail shader to the corresponding patch on the globe.
export function surfaceDetails(scene, base, common, loader) {
  const mobile=matchMedia('(pointer:coarse)').matches;
  const limit=mobile?5:10;
  const live=new Map(), failed=new Set();
  let wanted=[], busy=false, signature='';
  const geometry=new THREE.PlaneGeometry(1,1,12,12);
  const vertexShader=`
    varying vec2 screen;
    uniform vec2 size,center;
    uniform float radius,progress;
    uniform vec3 bounds;
    void main(){
      vec2 ll=radians(bounds.xy+uv*bounds.z);
      float delta=ll.x-center.x;
      vec2 disc=vec2(cos(ll.y)*sin(delta),
        sin(ll.y)*cos(center.y)-cos(ll.y)*cos(delta)*sin(center.y));
      screen=vec2(.5,.5+.012*progress)+disc*radius/size;
      gl_Position=vec4(screen*2.-1.,0.,1.);
    }`;
  async function next(){
    if(busy)return;
    const item=wanted.find(i=>!live.has(i.key)&&!failed.has(i.key));
    if(!item)return;
    busy=true;
    let textures=[];
    try {
      const names=item.us?['day','night']:['world'];
      for(const name of names) textures.push(await loader.loadAsync('./assets/detail/'+name+'_'+item.x+'_'+item.y+'.jpg'));
      if(wanted.some(i=>i.key===item.key)){
        const material=new THREE.ShaderMaterial({
          uniforms:{...common,bounds:{value:new THREE.Vector3(item.x,item.y,item.step)},
            detailDay:{value:textures[0]},detailNight:{value:textures[1]||textures[0]}},
          defines:item.us?{DETAIL:1,REGIONAL:1}:{DETAIL:1},
          vertexShader,fragmentShader:base.fragmentShader,depthTest:false,depthWrite:false,side:THREE.DoubleSide
        });
        const mesh=new THREE.Mesh(geometry,material);
        mesh.frustumCulled=false;mesh.renderOrder=item.us?2:1;
        scene.add(mesh);live.set(item.key,{mesh,textures});textures=[];
      }
    }catch{failed.add(item.key);}
    finally{textures.forEach(t=>t.dispose());busy=false;}
  }
  return function update(t,lon,lat,zoom,radius,w,h,pixelRatio){
    const us=t===1 && radius*pixelRatio*Math.PI/180>45;
    const step=us?6:30;
    const key=[us,Math.round(lon/1.5),Math.round(lat/1.5),Math.round(radius/w*10),w,h].join('/');
    if(key!==signature){
      signature=key;wanted=[];
      const cos=Math.cos(lat*Math.PI/180);
      for(let x=us?-132:-180;x<(us?-60:180);x+=step){
        for(let y=us?20:-90;y<(us?56:90);y+=step){
          const dx=(((x+step/2-lon+540)%360)-180)*cos,dy=y+step/2-lat;
          if(Math.abs(dx)>w/radius*36+step || Math.abs(dy)>h/radius*36+step)continue;
          wanted.push({x,y,us,step,key:[us,x,y].join('/'),distance:dx*dx+dy*dy});
        }
      }
      wanted.sort((a,b)=>a.distance-b.distance);wanted=wanted.slice(0,limit);
      for(const [id,entry] of live)if(!wanted.some(i=>i.key===id)){
        scene.remove(entry.mesh);entry.mesh.material.dispose();entry.textures.forEach(t=>t.dispose());live.delete(id);
      }
    }
    // Avoid network churn while the globe is rotating.
    if(t===1 || (t>.05 && t<.35))next();
  };
}
