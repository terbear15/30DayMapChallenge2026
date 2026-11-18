import * as THREE from './vendor/three.module.js';

import {surfaceDetails} from './details.js';
export async function earthView(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const loader = new THREE.TextureLoader();
  const [world,lights]=await Promise.all(['day','night'].map(phase=>loader.loadAsync('./assets/'+phase+'-preview.jpg')));
  const atmosphere=await loader.loadAsync('./assets/atmosphere.webp');
  const uniforms={terrain:{value:world},terrainReady:{value:0},atmosphere:{value:atmosphere},world:{value:world},lights:{value:lights},region:{value:world},localLights:{value:lights},regionReady:{value:0}};
  // Upgrade the regional base after the first paint, one texture at a time.
  setTimeout(async()=>{
    try{
      const globe=await loader.loadAsync('./assets/day-globe-medium.jpg');
      uniforms.world.value=globe;
      const region=await loader.loadAsync('./assets/day-us.jpg');
      const night=await loader.loadAsync('./assets/night-us.jpg');
      uniforms.region.value=region;uniforms.localLights.value=night;uniforms.regionReady.value=1;
    }catch{/* The global base remains available. */}
  },400);
  Object.assign(uniforms,{
    size:{value:new THREE.Vector2()}, radius:{value:1}, center:{value:new THREE.Vector2()},
    sun:{value:new THREE.Vector3()}, progress:{value:0}
  });
  loader.loadAsync('./assets/terrain.webp').then(texture=>{
    uniforms.terrain.value=texture;
    uniforms.terrainReady.value=1;
  }).catch(()=>{/* Satellite imagery remains usable without relief. */});
  const material = new THREE.ShaderMaterial({uniforms,
    vertexShader:'varying vec2 screen; void main(){screen=uv; gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`
      varying vec2 screen;
      uniform vec2 size,center;
      uniform float radius,progress;
      uniform vec3 sun;
      uniform float regionReady;
      #ifdef DETAIL
      uniform vec3 bounds;
      uniform sampler2D detailDay,detailNight;
      #endif
      uniform sampler2D terrain;
      uniform float terrainReady;
      uniform sampler2D atmosphere;
      uniform sampler2D world,lights,region,localLights;
      float hash(vec2 p){return fract(sin(dot(mod(p,211.),vec2(127.1,311.7)))*43758.5453);}
      float noiseField(vec2 p){
        vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      vec3 sky(vec2 p){
        vec2 q=p/size.y;
        float dust=noiseField(q*4.)*.54+noiseField(q*11.)*.29+noiseField(q*33.)*.12+noiseField(q*90.)*.05;
        float band=exp(-pow(abs(q.y-.26*q.x-.18+(dust-.5)*.5)*4.,2.));
        vec3 cloud=vec3(.17,.115,.16)*smoothstep(.30,.78,dust)*band;
        vec2 cell=floor(p/7.);
        float seed=hash(cell);
        vec2 pos=(vec2(hash(cell+17.),hash(cell+71.))-.5)*.65;
        float dist=length(fract(p/7.)-.5-pos)*7.;
        float star=step(.969-.065*band*dust,seed)*exp(-dist*dist*1.5);
        return vec3(.008,.009,.016)+.5*cloud+star*mix(vec3(.55,.62,.72),vec3(.94,.84,.68),seed);
      }
      void main(){
        vec2 disc=(screen-vec2(.5,.5+.012*progress))*size/radius;
        float r2=dot(disc,disc);
        if(r2>=1.){gl_FragColor=vec4(.5*sky(screen*size),1.);return;}
        float z=sqrt(1.-r2), c=cos(center.y),s=sin(center.y);
        float lat=asin(disc.y*c+z*s);
        float lon=center.x+atan(disc.x,z*c-disc.y*s);
        vec2 globe=vec2(fract(lon/6.2831853+.5),lat/3.14159265+.5);
        vec2 local=(degrees(vec2(lon,lat))-vec2(-132.,20.))/vec2(72.,36.);
        vec2 edge=min(local,1.-local);
        float inset=regionReady*smoothstep(0.,.025,min(edge.x,edge.y));
        vec3 day=mix(texture2D(world,globe).rgb,texture2D(region,local).rgb,inset);
        vec3 night=mix(texture2D(lights,globe).rgb,texture2D(localLights,local).rgb,inset);
        #ifdef DETAIL
        vec2 tile=(vec2(fract(lon/6.2831853+.5)*360.-180.,degrees(lat))-bounds.xy)/bounds.z;
        if(min(tile.x,tile.y)<0. || max(tile.x,tile.y)>1.)discard;
        #ifdef REGIONAL
        day=texture2D(detailDay,tile).rgb;
        night=texture2D(detailNight,tile).rgb;
        #else
        day=mix(texture2D(detailDay,tile).rgb,day,inset);
        #endif
        #endif
        float illumination=dot(vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon)),sun);
        vec3 air=texture2D(atmosphere,globe).rgb;
        vec3 normal=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));
        vec3 eye=vec3(cos(center.y)*cos(center.x),sin(center.y),cos(center.y)*sin(center.x));
        float ocean=smoothstep(.45,.95,air.g);
        float glint=pow(max(0.,dot(reflect(-sun,normal),eye)),32.)*smoothstep(0.,.22,illumination);
        vec3 sea=vec3(.026,.071,.125)+air.b*vec3(.13,.34,.53);
        day=mix(day,sea,.72*ocean)+ocean*glint*vec3(.24,.22,.17);
        day=mix(vec3(dot(day,vec3(.2126,.7152,.0722))),day,.36+.24*progress);
        float terrain=dot(day,vec3(.2126,.7152,.0722));
        night=max(night,vec3(.024,.044,.082)+terrain*vec3(.055,.085,.13));
        float direct=sqrt(max(illumination,0.));
        day*=.63+.52*direct;
        if(terrainReady>.5 && inset>.0 && ocean<.95 && illumination>-.04){
          vec2 stepUV=vec2(1./4096.,1./2048.);
          float eastRise=texture2D(terrain,local+vec2(stepUV.x,0.)).r-texture2D(terrain,local-vec2(stepUV.x,0.)).r;
          float northRise=texture2D(terrain,local+vec2(0.,stepUV.y)).r-texture2D(terrain,local-vec2(0.,stepUV.y)).r;
          // NASA encodes 0..6400 m. Correct east-west spacing for latitude.
          vec2 slope=vec2(eastRise/max(.35,cos(lat)),northRise)*(6400./(2.*111195.*72./4096.));
          vec3 east=vec3(-sin(lon),0.,cos(lon));
          vec3 north=vec3(-sin(lat)*cos(lon),cos(lat),-sin(lat)*sin(lon));
          vec3 facet=normalize(normal-2.4*(slope.x*east+slope.y*north));
          float contrast=clamp((dot(facet,sun)-illumination)*1.6,-.38,.32);
          day*=1.+contrast*inset*(1.-ocean)*smoothstep(-.04,.08,illumination);
        }
        float twilight=exp(-pow(abs(illumination+.012)/.105,2.));
        vec3 surface=mix(night,day,smoothstep(-.16,.12,illumination));
        surface+=twilight*vec3(.075,.031,.008);
        float veil=1.-smoothstep(.1,1.,progress);
        if(veil>0.){
          float clouds=smoothstep(.065,.89,air.r)*veil;
          float sunlit=smoothstep(-.10,.35,illumination);
          vec3 cloudColor=mix(vec3(.085,.10,.135),vec3(.86,.88,.90)*(.65+.35*direct),sunlit);
          surface=mix(surface,cloudColor,clouds*.93);
        }
        gl_FragColor=vec4(surface*(.83+.17*z),1.);
      }`});
  const scene=new THREE.Scene(),camera=new THREE.Camera();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  const details=surfaceDetails(scene,material,uniforms,loader);
  let previousFrame=0,slowFrames=0;
  return function render(t,lon,lat,zoom,solar){
    const now=performance.now(), elapsed=now-previousFrame;
    previousFrame=now;
    slowFrames=elapsed>36 && elapsed<300?slowFrames+1:Math.max(0,slowFrames-1);
    if(slowFrames>=18 && renderer.getPixelRatio()>1){
      renderer.setPixelRatio(Math.max(1,renderer.getPixelRatio()-.25));
      slowFrames=0;
    }
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(uniforms.size.value.x!==w || uniforms.size.value.y!==h){
      renderer.setSize(w,h,false); uniforms.size.value.set(w,h);
    }
    const eased=t*t*(3-2*t);
    const from=Math.min(w,h)*.32, to=Math.min(w*1.04,h*1.64)*zoom;
    uniforms.radius.value=from*Math.pow(to/from,eased);
    uniforms.center.value.set((18+(lon-18)*eased)*Math.PI/180,(8+(lat-8)*eased)*Math.PI/180);
    uniforms.progress.value=eased;
    uniforms.sun.value.fromArray(solar);
    details(t,uniforms.center.value.x*180/Math.PI,uniforms.center.value.y*180/Math.PI,zoom,uniforms.radius.value,w,h,renderer.getPixelRatio());
    renderer.render(scene,camera);
  };
}
