/* Native chapter entries, moving binary, accretion disk and outgoing jets. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {chromium}=require('playwright'),args=process.argv.slice(2),value=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const root=path.resolve(__dirname,'../docs'),out=path.resolve(value('--output','cosmos-exotics-qa')),desktop=args.includes('--desktop'),live=value('--url','');
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
  for(const chapter of ['spica','quasar']){
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
    if(first.visible&&await page.locator('iframe.cosmos-ready').count()&&first.renderer===(chapter==='spica'?'webgl-barycentric-spica':'webgl-accretion-bipolar-jets'))break;
   }
   assert.equal(first.renderer,chapter==='spica'?'webgl-barycentric-spica':'webgl-accretion-bipolar-jets');assert(first.visible);assert.equal(first.error,0);assert(first.touring);assert(first.step.endsWith('/ 7'));
   await page.clock.runFor(400);first=await read();
   const firstPng=await page.screenshot({path:path.join(out,chapter+'-first.png')});
   await page.clock.runFor(1200);const second=await read();
   const secondPng=await page.screenshot({path:path.join(out,chapter+'-second.png')});
   assert(second.phase>first.phase);assert.notEqual(crypto.createHash('sha256').update(firstPng).digest('hex'),crypto.createHash('sha256').update(secondPng).digest('hex'));
   if(chapter==='spica'){
    assert(Math.hypot(...second.a.map((v,i)=>v-first.a[i]))>.3,'both stellar centres must orbit');
    for(let i=0;i<3;i++)assert(Math.abs(second.a[i]*11.4+second.b[i]*7.2)<1e-5,'shared centre of mass must stay fixed');
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
   reports.push({chapter,first,second,after});console.log('PASS',chapter,desktop?'mouse':'touch',first.phase,'→',second.phase);
  }
  assert.deepEqual(errors,[]);assert(!warnings.some(s=>s.includes('optional scene shader')),'both new GLSL programs must compile');
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({viewport:desktop?'desktop':'mobile',reports,errors,warnings},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
