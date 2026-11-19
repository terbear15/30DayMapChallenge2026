import * as THREE from './vendor/three.module.js';

// Tile meshes limit the detail shader to the corresponding patch on the globe.
export function surfaceDetails(scene, base, common, loader) {
  const mobile=matchMedia('(pointer:coarse)').matches;
  const limit=mobile?6:14;
  const live=new Map(), failed=new Map(), pending=new Set();
  let wanted=[], busy=0, signature='';
  const heights=new Map();
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
    if(busy>=2)return;
    const item=wanted.find(i=>!live.has(i.key)&&!pending.has(i.key)&&(failed.get(i.key)||0)<Date.now());
    if(!item)return;
    pending.add(item.key);busy++;
    let textures=[],retained=false;
    const col=Math.floor((item.x+180)/18),row=Math.floor((90-item.y-item.step/2)/18);
    const demKey=col+'_'+row;
    let dem=heights.get(demKey);
    if(!dem){
      dem={users:0,image:loader.loadAsync('./assets/elevation/'+demKey+'.webp')};
      heights.set(demKey,dem);
    }
    dem.users++;
    function release(){if(--dem.users===0){heights.delete(demKey);dem.image.then(t=>t.dispose()).catch(()=>{});}}
    try {
      const urls=['day','night'].map(phase=>'./assets/satellite/'+phase+'_'+item.col+'_'+item.row+'.webp');
      const results=await Promise.allSettled([...urls.map(url=>loader.loadAsync(url)),dem.image]);
      textures=results.slice(0,2).filter(r=>r.status==='fulfilled').map(r=>r.value);
      if(textures.length!==2 || results[2].status!=='fulfilled')throw Error('Tile unavailable');
      if(wanted.some(i=>i.key===item.key)){
        const material=new THREE.ShaderMaterial({
          uniforms:{...common,detailOpacity:{value:0},bounds:{value:new THREE.Vector3(item.x,item.y,item.step)},
            detailElevation:{value:results[2].value},elevationCorner:{value:new THREE.Vector2(-180+col*18,72-row*18)},detailDay:{value:textures[0]},detailNight:{value:textures[1]||textures[0]}},
          defines:{DETAIL:1,REGIONAL:1},
          vertexShader,fragmentShader:base.fragmentShader,depthTest:false,depthWrite:false,transparent:true,side:THREE.FrontSide
        });
        const mesh=new THREE.Mesh(geometry,material);
        mesh.frustumCulled=false;mesh.renderOrder=2;
        scene.add(mesh);live.set(item.key,{mesh,textures,release,born:performance.now()});retained=true;textures=[];
      }
    }catch{failed.set(item.key,Date.now()+60000);}
    finally{if(!retained)release();textures.forEach(t=>t.dispose());pending.delete(item.key);busy--;}
  }
  return function update(t,lon,lat,zoom,radius,w,h,pixelRatio){
    // The landing has no layer change. Refinement follows deliberate exploration.
    const exploring=t===1 && (zoom>1.06 || Math.abs(lon+96)>1 || Math.abs(lat-38)>1);
    for(const tile of live.values()){
      tile.mesh.visible=exploring;
      tile.mesh.material.uniforms.detailOpacity.value=Math.min(1,(performance.now()-tile.born)/550);
    }
    if(!exploring)return;
    const step=6,level=1;
    const key=[level,Math.round(lon/step*3),Math.round(lat/step*3),Math.round(radius/w*10),w,h].join('/');
    if(key!==signature){
      signature=key;wanted=[];
      const cos=Math.max(.03,Math.cos(lat*Math.PI/180));
      const cx=Math.floor((lon+180)/step),cy=Math.floor((90-lat)/step);
      const cols=Math.round(360/step),rows=cols/2;
      const nx=Math.min(cols/2,Math.ceil(w/radius*37/(step*cos))+1);
      const ny=Math.ceil(h/radius*37/step)+1;
      for(let offset=-nx;offset<Math.min(nx+1,cols-nx);offset++){
        const col=((cx+offset)%cols+cols)%cols;
        for(let row=Math.max(0,cy-ny);row<=Math.min(rows-1,cy+ny);row++){
          const x=-180+col*step,y=90-(row+1)*step;
          const dx=(((x+step/2-lon+540)%360)-180)*cos,dy=y+step/2-lat;
          wanted.push({x,y,step,level,col,row,key:[level,col,row].join('/'),distance:dx*dx+dy*dy});
        }
      }
      wanted.sort((a,b)=>a.distance-b.distance);wanted=wanted.slice(0,limit);
      for(const [id,entry] of live)if(!wanted.some(i=>i.key===id)){
        scene.remove(entry.mesh);entry.mesh.material.dispose();entry.textures.forEach(t=>t.dispose());entry.release();live.delete(id);
      }
    }
    next();
  };
}
