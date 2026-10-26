/* Native chapter entries, moving binary, accretion disk and outgoing jets. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {chromium}=require('playwright'),args=process.argv.slice(2),value=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const root=path.resolve(__dirname,'../docs'),out=path.resolve(value('--output','cosmos-exotics-qa')),desktop=args.includes('--desktop'),live=value('--url',''),only=value('--chapter',''),record=args.includes('--record');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.COSMOS_CHROMIUM_EXECUTABLE,headless:true,
  ...(process.env.COSMOS_CHROMIUM_LEGACY==='1'?{ignoreDefaultArgs:['--headless']}:{}),
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
   ...(process.env.COSMOS_CHROMIUM_LEGACY==='1'?['--headless=old','--single-process','--no-zygote']:[])]});
 try{
  const page=await browser.newPage({viewport:desktop?{width:1440,height:900}:{width:390,height:844},deviceScaleFactor:desktop?1:2,isMobile:!desktop,hasTouch:!desktop});
  const errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});
  if(!live)await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='cosmos.test'){const file=path.join(root,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:'missing'});}
   if(u.pathname.endsWith('/earth_atmos_2048.jpg'))return route.fulfill({path:path.resolve(root,'../../analysis/earth.jpg'),headers:{'access-control-allow-origin':'*'}});
   if(u.pathname.endsWith('/ne_110m_land.geojson'))return route.fulfill({path:path.resolve(root,'../../analysis/land.json'),contentType:'application/json',headers:{'access-control-allow-origin':'*'}});
   return route.abort();
  });
  const epoch=new Date('2026-10-27T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(+epoch+100);
  const reports=[];
  for(const chapter of only?only.split(','):['spica','quasar','cygnus']){
   const url=new URL(live||'http://cosmos.test/');url.searchParams.set('start',chapter);
   await page.goto(url.href,{waitUntil:'load',timeout:90000});
   const frame=page.frames().find(f=>f.url().includes('v085-final'));assert(frame);
   const read=()=>frame.locator('.cosmos-deep-v212').evaluate(e=>{
    const gl=e.getContext('webgl'),program=gl.getParameter(gl.CURRENT_PROGRAM),uniform=name=>{const u=gl.getUniformLocation(program,name);return u===null?null:gl.getUniform(program,u);};
    return {renderer:e.dataset.renderer,phase:+e.dataset.phase,visible:getComputedStyle(e).display!=='none',
     a:uniform('u_star_a'),b:uniform('u_star_b'),eye:uniform('u_eye'),right:uniform('u_right'),forward:uniform('u_forward'),error:gl.getError(),
     name:document.getElementById('tourName').textContent,touring:document.body.classList.contains('touring'),hint:document.getElementById('touchRotateHint').textContent,step:document.getElementById('tourStep').textContent};
   });
   let first;
   for(let i=0;i<50;i++){
    await page.clock.runFor(100);first=await read();
    if(first.visible&&await page.locator('iframe.cosmos-ready').count()&&first.renderer===({spica:'webgl-barycentric-spica',quasar:'webgl-accretion-bipolar-jets',cygnus:'webgl-wind-fed-cygnus'}[chapter]))break;
   }
   assert.equal(first.renderer,{spica:'webgl-barycentric-spica',quasar:'webgl-accretion-bipolar-jets',cygnus:'webgl-wind-fed-cygnus'}[chapter]);assert(first.visible);assert.equal(first.error,0);assert(first.touring);assert(first.step.endsWith('/ 8'));
   await page.clock.runFor(400);first=await read();
   const firstPng=await page.screenshot({path:path.join(out,chapter+'-first.png')});
   if(record){
    const {spawn}=require('child_process'),{once}=require('events');
    const encoder=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate','24','-i','pipe:0','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-an',path.join(out,chapter+'.mp4')],{stdio:['pipe','ignore','inherit']});
    const done=once(encoder,'close'),frames=chapter==='cygnus'?188:130,hashes=new Set();let elapsed=0;
    try{
     for(let i=0;i<frames;i++){
      const ms=Math.round(i*1000/24);if(ms>elapsed)await page.clock.runFor(ms-elapsed);elapsed=ms;
      const data=await page.screenshot({type:'jpeg',quality:94});hashes.add(crypto.createHash('sha256').update(data).digest('hex'));
      if(!encoder.stdin.write(data))await once(encoder.stdin,'drain');
     }
     encoder.stdin.end();const [code]=await done;assert.equal(code,0);assert(hashes.size>frames*.98);
     reports.push({chapter,frames,fps:24,uniqueFrames:hashes.size,renderingCapture:true});console.log('PASS recorded',chapter,frames,'native frames');
    }finally{if(!encoder.killed)encoder.kill();}
    continue;
   }
   await page.clock.runFor(1200);const second=await read();
   const secondPng=await page.screenshot({path:path.join(out,chapter+'-second.png')});
   assert(second.phase>first.phase);assert.notEqual(crypto.createHash('sha256').update(firstPng).digest('hex'),crypto.createHash('sha256').update(secondPng).digest('hex'));
   if(chapter==='spica'||chapter==='cygnus'){
    const mass=chapter==='spica'?[11.4,7.2]:[40.6,21.2];
    assert(Math.hypot(...second.a.map((v,i)=>v-first.a[i]))>.3,'both stellar centres must orbit');
    for(let i=0;i<3;i++)assert(Math.abs(second.a[i]*mass[0]+second.b[i]*mass[1])<1e-4,'shared centre of mass must stay fixed');
   }
   const before=second;
   if(desktop){await page.mouse.move(195,400);await page.mouse.down();await page.mouse.move(255,420,{steps:3});await page.mouse.up();}
   else{
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:400}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:255,y:420}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
   }
   await page.clock.runFor(80);const after=await read();assert(after.touring);assert.equal(after.name,before.name);assert.equal(after.error,0);
   assert(Math.max(...after.right.map((v,i)=>Math.abs(v-before.right[i])))>.1,'drag must rotate the real 3D view');
   await page.screenshot({path:path.join(out,chapter+'-dragged.png')});
   // Freeze the actual camera and both centres, changing only shader time.
   // This distinguishes evolving plasma, disk and jet flow from camera movement.
   const flow=await frame.locator('.cosmos-deep-v212').evaluate((e,chapter)=>{
    const gl=e.getContext('webgl'),p=gl.getParameter(gl.CURRENT_PROGRAM),location=gl.getUniformLocation(p,'u_time'),time=gl.getUniform(p,location);
    const uniform=name=>Array.from(gl.getUniform(p,gl.getUniformLocation(p,name)));
    const eye=uniform('u_eye'),right=uniform('u_right'),up=uniform('u_up'),forward=uniform('u_forward');
    const sample=t=>{gl.uniform1f(location,t);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);const pixels=new Uint8Array(e.width*e.height*4);gl.readPixels(0,0,e.width,e.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
    const a=sample(time),b=sample(time+.38),repeat=sample(time);
    const counts={surface:{pixels:0,changed:0,total:0},disk:{pixels:0,changed:0,total:0},jet:{pixels:0,changed:0,total:0},wind:{pixels:0,changed:0,total:0}};
    const project=v=>{const q=v.map((n,i)=>n-eye[i]),z=q.reduce((s,n,i)=>s+n*forward[i],0);return [e.width/2+e.height*.75*q.reduce((s,n,i)=>s+n*right[i],0)/z,e.height/2+e.height*.75*q.reduce((s,n,i)=>s+n*up[i],0)/z];};
    const stream=chapter==='cygnus'?Array.from({length:9},(_,i)=>project(window.CosmosCygnus.gasPoint(.15+i*.08,time))):[];
    for(let y=0;y<e.height;y++)for(let x=0;x<e.width;x++){
     const i=(y*e.width+x)*4,d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
     if(a[i+3]<8&&b[i+3]<8)continue;
     let group='surface';
     if(chapter==='quasar')group=Math.abs(y-e.height/2)>e.height*.24?'jet':'disk';
     if(chapter==='cygnus'){
      if(stream.some(v=>Math.hypot(x-v[0],y-v[1])<e.height*.025))group='wind';
      else group=a[i]>a[i+2]*1.3?'disk':'surface';
     }
     const count=counts[group];count.pixels++;count.total+=d;if(d>12)count.changed++;
    }
    let repeatError=0;for(let i=0;i<a.length;i++)repeatError+=Math.abs(a[i]-repeat[i]);
    return {counts,repeatError,error:gl.getError()};
   },chapter);
   assert.equal(flow.error,0);assert.equal(flow.repeatError,0,'same camera, positions and shader time must reproduce the same pixels');
   for(const part of chapter==='quasar'?['disk','jet']:chapter==='cygnus'?['surface','disk','wind']:['surface']){
    const count=flow.counts[part];assert(count.pixels>30,part+' must be visible');assert(count.changed>count.pixels*.015,part+' must animate with the camera held fixed');
   }
   reports.push({chapter,first,second,after,flow});console.log('PASS',chapter,desktop?'mouse':'touch',first.phase,'→',second.phase,JSON.stringify(flow.counts));
  }
  assert.deepEqual(errors,[]);assert(!warnings.some(s=>s.includes('optional scene shader')),'both new GLSL programs must compile');
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({viewport:desktop?'desktop':'mobile',reports,errors,warnings},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
