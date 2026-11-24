/* Фон: горы из точек. Камера летит по долине, хребет на горизонте, звёзды.
   three.js r128, подключается в index.html. */
(() => {
  const host = document.getElementById('bg');
  if (!window.THREE || !host) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = innerWidth < 820 || matchMedia('(pointer: coarse)').matches;

  let r;
  try { r = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  r.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
  r.setClearColor(0, 0);
  host.appendChild(r.domElement);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(58, 1, .1, 600);

  // ---- долина с горами по бокам: сетка точек, высота в шейдере ----
  const L = 260, W = small ? 200 : 300, step = small ? 1.25 : .8;
  const pos = [], seed = [];
  for (let z = 0; z < L; z += step)
    for (let x = -W / 2; x < W / 2; x += step) {
      pos.push(x + (Math.random() - .5) * step * .6, 0, -z + (Math.random() - .5) * step * .6);
      seed.push(Math.random());
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));

  const NOISE = `
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
   return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
  float hills(vec2 p){return sin(p.x*.045)*2.2+sin(p.y*.031+p.x*.017)*2.+sin(p.y*.013)*3.5+pow(min(abs(p.x),60.)/30.,2.)*5.;}
  float ridged(vec2 p){float a=.5,s=0.,f=1.;for(int i=0;i<5;i++){float n=1.-abs(noise(p*f)*2.-1.);n=n*n;s+=n*a;f*=2.03;a*=.5;}return s;}
  float h(vec2 p){float valley=smoothstep(10.,80.,abs(p.x));
   return ridged(p*.016)*48.*valley*valley+hills(p)*.35-3.;}`;

  const mouse = new THREE.Vector2(9, 9);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uL: { value: L }, uPx: { value: r.getPixelRatio() }, uMouse: { value: mouse }, uFade: { value: 1 }, uOpen: { value: 0 } },
    vertexShader: NOISE + `
    uniform float uT,uL,uPx,uOpen;uniform vec2 uMouse;attribute float seed;varying float vA;varying float vS;varying float vH;
    void main(){vec3 p=position;p.z=mod(p.z+uT,uL)-uL+8.;
     float y=h(vec2(p.x,p.z-uT));p.y=y;vH=y;
     float ax=abs(p.x);p.x+=sign(p.x)*uOpen*(10.+smoothstep(4.,70.,ax)*72.);p.y-=uOpen*smoothstep(20.,0.,ax)*2.5;
     vec4 mv=modelViewMatrix*vec4(p,1.);float d=-mv.z;
     vec4 cp=projectionMatrix*mv;vec2 ndc=cp.xy/cp.w;
     float push=smoothstep(.22,0.,length(ndc-uMouse));mv.y+=push*1.6;
     gl_Position=projectionMatrix*mv;
     gl_PointSize=min(uPx*3.2,uPx*(1.+seed*1.2)*(70./d))*(1.+push*.6);
     vA=smoothstep(uL-8.,uL*.4,d)*smoothstep(3.,22.,d)*(.6+.4*smoothstep(0.,18.,vH));vS=seed;}`,
    fragmentShader: `uniform float uFade;varying float vA;varying float vS;varying float vH;
    void main(){vec2 c=gl_PointCoord-.5;float r=length(c);if(r>.5)discard;
     vec3 col=vec3(.93,.92,.97);
     if(vS>.985)col=vec3(.776,.957,.196);else if(vS>.93)col=vec3(.62,.56,.96);
     col*=.55+.45*clamp(vH/30.,0.,1.);
     gl_FragColor=vec4(col,vA*uFade*(1.-smoothstep(.3,.5,r))*.95);}`
  });
  scene.add(new THREE.Points(g, mat));

  // ---- дальний хребет на горизонте ----
  const ridge = [], rs = [];
  const RN = small ? 2600 : 5200;
  const rn = x => { let v = 0, a = 1, f = .012; for (let i = 0; i < 5; i++) { v += a * (1 - Math.abs(Math.sin(x * f + i * 1.7) * Math.cos(x * f * .7 + i))); a *= .5; f *= 2.1; } return v; };
  for (let i = 0; i < RN; i++) {
    const x = (Math.random() - .5) * 620, top = rn(x) * 70 + 10, y = Math.random() * top;
    ridge.push(x, y - 8, -250 - Math.random() * 20); rs.push(y / top);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(ridge, 3));
  rg.setAttribute('k', new THREE.Float32BufferAttribute(rs, 1));
  const rmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uPx: { value: r.getPixelRatio() }, uOpen: { value: 0 } },
    vertexShader: `attribute float k;varying float vk;uniform float uPx,uOpen;void main(){vk=k;vec3 p=position;p.x+=sign(p.x)*uOpen*(40.+abs(p.x)*.35);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=uPx*2.;}`,
    fragmentShader: `varying float vk;void main(){if(length(gl_PointCoord-.5)>.5)discard;gl_FragColor=vec4(vec3(.75,.72,.9),.25+.7*vk*vk);}`
  });
  const ridgeP = new THREE.Points(rg, rmat); scene.add(ridgeP);

  // ---- звёзды ----
  const sp = [];
  for (let i = 0; i < (small ? 500 : 1100); i++) {
    const a = Math.random() * Math.PI * 2, e = Math.random() * .9 + .08, R = 300;
    sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R * .8 + 20, -Math.abs(Math.sin(a)) * R - 40);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xe8e4f5, size: 1.3, sizeAttenuation: false, transparent: true, opacity: .7 }));
  scene.add(stars);

  const fit = () => { const w = host.clientWidth, h = host.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  addEventListener('resize', fit); fit();

  let open = 0, openT = 0;
  window.bgOpen = v => { openT = v ? 1 : 0; };
  let tx = 0, ty = 0, mx = 0, my = 0, travel = 0, last = performance.now(), run = true;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth * 2 - 1; ty = -(e.clientY / innerHeight * 2 - 1); mouse.set(tx, ty); });
  document.addEventListener('visibilitychange', () => { run = !document.hidden; if (run) { last = performance.now(); requestAnimationFrame(loop); } });

  const loop = now => {
    if (!run) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!reduce) travel += dt * 6;
    mat.uniforms.uT.value = travel;
    open += (openT - open) * Math.min(1, dt * (openT > open ? 3.2 : 4.5));
    const eo = reduce ? 0 : open * open * (3 - 2 * open);
    mat.uniforms.uOpen.value = eo; rmat.uniforms.uOpen.value = eo;
    mx += (tx - mx) * dt * 2; my += (ty - my) * dt * 2;
    const sc = Math.min(scrollY / innerHeight, 4);
    const eye = 9 + sc * 5;
    cam.position.set(mx * 4, eye + my * 1.5, 4);
    cam.lookAt(mx * 8, eye - 2.2 - sc * 2.5 + my * 2, -60);
    mat.uniforms.uFade.value = 1 - Math.min(sc, 3) * .12;
    stars.rotation.z += dt * .004;
    ridgeP.position.x = -mx * 6;
    r.render(scene, cam);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
