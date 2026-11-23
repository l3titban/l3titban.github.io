import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { OrbitControls } from './OrbitControls.js';
export {THREE};
export function setup(){
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true});
  r.setPixelRatio(Math.min(devicePixelRatio,2)); r.setSize(innerWidth,innerHeight);
  r.shadowMap.enabled=true; r.shadowMap.type=THREE.PCFSoftShadowMap;
  r.toneMapping=THREE.ACESFilmicToneMapping; r.toneMappingExposure=1.0; r.outputColorSpace=THREE.SRGBColorSpace;
  document.body.appendChild(r.domElement);
  const scene=new THREE.Scene();
  const pm=new THREE.PMREMGenerator(r); scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;
  const cam=new THREE.PerspectiveCamera(30,innerWidth/innerHeight,0.1,100);
  const key=new THREE.DirectionalLight(0xffffff,2.2); key.position.set(3,6,4); key.castShadow=true;
  key.shadow.mapSize.set(2048,2048); key.shadow.radius=8; key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;
  scene.add(key);
  const rim=new THREE.DirectionalLight(0xffffff,1.2); rim.position.set(-4,3,-3); scene.add(rim);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:0.35}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  r.render=(orig=>function(){return orig.apply(this,arguments)})(r.render);
  const live=(target)=>{
    const ctl=new OrbitControls(cam,r.domElement);
    ctl.target.set(...target); ctl.enableDamping=true; ctl.dampingFactor=.08;
    ctl.autoRotate=!matchMedia('(prefers-reduced-motion: reduce)').matches; ctl.autoRotateSpeed=1.4;
    const d=cam.position.distanceTo(ctl.target); ctl.minDistance=d*.45; ctl.maxDistance=d*1.6;
    ctl.maxPolarAngle=Math.PI*.52; ctl.enablePan=false; ctl.update();
    let idle;ctl.addEventListener('start',()=>{ctl.autoRotate=false;clearTimeout(idle);document.body.classList.add('used')});
    ctl.addEventListener('end',()=>{clearTimeout(idle);idle=setTimeout(()=>ctl.autoRotate=true,4000)});
    addEventListener('resize',()=>{r.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
    cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();
    const loop=()=>{ctl.update();r.render(scene,cam);requestAnimationFrame(loop)};loop();
  };
  return {r,scene,cam,key,rim,ground,live};
}
export function ui(opts){
  // opts: [{label, q}] — переключатели вида (перезагружают с параметром)
  const cur=location.search.replace(/^\?/,'');
  const bar=document.createElement('div');bar.className='ui';
  bar.innerHTML=opts.map(o=>`<a href="?${o.q}" class="${o.q===cur?'on':''}">${o.label}</a>`).join('');
  document.body.appendChild(bar);
  const hint=document.createElement('div');hint.className='hint';hint.textContent='Крути мышкой или пальцем · колёсиком ближе';
  document.body.appendChild(hint);
}

export function textTex(text,{w=512,h=2048,font='bold 300px Arial',color='#8a8a8a',bg='rgba(0,0,0,0)',rotate=true}={}){
  const c=document.createElement('canvas'); c.width=w;c.height=h; const x=c.getContext('2d');
  x.fillStyle=bg; x.fillRect(0,0,w,h); x.fillStyle=color; x.font=font; x.textAlign='center'; x.textBaseline='middle';
  if(rotate){x.translate(w/2,h/2); x.rotate(Math.PI/2); x.fillText(text,0,0);} else x.fillText(text,w/2,h/2);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return t;
}
