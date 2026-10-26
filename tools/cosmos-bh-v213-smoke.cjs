/* Real-time handoff check; --delayed additionally holds the atlas under a controlled clock. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const pw=require(process.env.COSMOS_PLAYWRIGHT_MODULE||'playwright'),args=process.argv.slice(2),value=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const root=path.resolve(value('--root',path.join(__dirname,'../docs'))),out=path.resolve(value('--output','cosmos-bh-qa')),live=value('--url',''),delayed=args.includes('--delayed');
const browserName=process.env.COSMOS_BROWSER||'chromium';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const launch={headless:true,args:browserName==='chromium'?['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]};
 if(browserName==='chromium'&&process.env.COSMOS_CHROMIUM_EXECUTABLE)launch.executablePath=process.env.COSMOS_CHROMIUM_EXECUTABLE;
 if(browserName==='webkit'&&process.env.COSMOS_WEBKIT_EXECUTABLE)launch.executablePath=process.env.COSMOS_WEBKIT_EXECUTABLE;
 if(process.env.COSMOS_CHROMIUM_LEGACY==='1'&&browserName==='chromium'){launch.ignoreDefaultArgs=['--headless'];launch.args.push('--headless=old','--single-process','--no-zygote');}
 const browser=await pw[browserName].launch(launch);let release;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.qaGaps=[];let last=performance.now();setInterval(()=>{const now=performance.now();qaGaps.push({at:now,gap:now-last});last=now;},100);
   const original=WebGLRenderingContext.prototype.texImage2D;
   WebGLRenderingContext.prototype.texImage2D=function(...a){const list=this.canvas.qaAllocations||(this.canvas.qaAllocations=[]);
    list.push(typeof a[3]==='number'?{width:a[3],height:a[4]}:{width:a[5]?.width,height:a[5]?.height});return original.apply(this,a);};
  });
  const gate=new Promise(r=>release=r);
  if(!live)await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='cosmos.test'){
    if(delayed&&u.pathname.endsWith('cosmos-v13-radiance-atlas-v213.webp'))await gate;
    const file=path.join(root,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
    return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:'missing'});
   }
   if(u.pathname.endsWith('/earth_atmos_2048.jpg'))return route.fulfill({path:path.resolve(root,'../../analysis/earth.jpg'),headers:{'access-control-allow-origin':'*'}});
   if(u.pathname.endsWith('/ne_110m_land.geojson'))return route.fulfill({path:path.resolve(root,'../../analysis/land.json'),contentType:'application/json',headers:{'access-control-allow-origin':'*'}});
   return route.abort();
  });
  if(delayed){const epoch=new Date('2026-10-27T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(epoch.getTime()+100);}
  await page.goto(live||'http://cosmos.test/',{waitUntil:'load',timeout:90000});
  const frame=page.frames().find(f=>f.url().includes('v085-final'));assert(frame);
  const state=()=>frame.evaluate(()=>{
   const layer=document.getElementById('cosmos-tour-blackhole-v061'),deep=document.querySelector('.cosmos-deep-v212'),sun=document.querySelector('.cosmos-sun-v207');
   return {name:document.getElementById('tourName').textContent,hidden:layer.hidden,open:layer.classList.contains('cosmos-hole-open'),worldPhase:deep.dataset.phase,
    deepDisplay:getComputedStyle(deep).display,sunOpacity:+sun.style.opacity,time:performance.now(),
    child:(()=>{try{const e=layer.querySelector('iframe').contentDocument.querySelector('#scene');return e?{...e.dataset,allocations:e.qaAllocations||[],width:e.width,height:e.height,starsReady:e.ownerDocument.getElementById('cosmos-stellar-backdrop-v218')?.dataset.ready,starTransform:e.ownerDocument.defaultView.getComputedStyle(e.ownerDocument.getElementById('cosmos-stellar-backdrop-v218')).transform}:null;}catch{return null;}})()};
  });
  let waiting=null;
  if(delayed){
   for(let i=0;i<90;i++){await page.clock.runFor(250);const s=await state();if(!s.hidden&&!s.open){waiting=s;break;}}
   assert(waiting,'did not enter loading state');await page.clock.runFor(750);const later=await state();
   assert.equal(later.open,false,'an unprepared black hole must not cover Orion');
   assert.equal(later.name,'Orion','retain the currently visible chapter while loading');
   assert(+later.worldPhase>+waiting.worldPhase,'Orion must continue animating while black-hole data is delayed');
   console.log('PASS delayed preparation keeps Orion alive',waiting.worldPhase,'→',later.worldPhase);release();
  }
  const started=Date.now(),phases=new Set(),starPositions=new Set();let enteredAt=0,allocations=null,solar=null,opened=false,bhSnapshot=false;
  for(let i=0;i<400&&Date.now()-started<90000;i++){
   if(delayed)await page.clock.runFor(250);else await page.waitForTimeout(200);
   const s=await state();
   if(s.open&&!s.hidden){
    const data=s.child;assert(data,'visible black hole must retain its ready canvas');
    assert.equal(data.ready,'true');assert.equal(data.preparation,'prebaked-lossless');assert.equal(data.frameTextures,'2');assert.equal(data.starsReady,'true');starPositions.add(data.starTransform);
    assert(data.allocations.every(a=>a.width<=620&&a.height<=420),'a full atlas must never be uploaded as a WebGL texture');
    assert.equal(data.allocations.filter(a=>a.width===620&&a.height===420).length,2);
    if(!opened){enteredAt=s.time;console.log('OPEN',s.time,data.width,data.height);}
    opened=true;phases.add(data.phase);allocations=data.allocations;
    if(!bhSnapshot&&phases.size>2){await page.screenshot({path:path.join(out,'black-hole.png')});bhSnapshot=true;}
   }
   if(opened&&s.name==='Solar system'&&s.hidden&&s.sunOpacity>.5){
    assert.equal(s.deepDisplay,'none','Orion must not remain after uncovering the Solar System');
    assert(phases.size>2,'black-hole animation must advance');solar=s;
    await page.screenshot({path:path.join(out,'solar.png')});break;
   }
  }
  assert(starPositions.size>1,'background stars must move while the black hole is visible');assert(opened,'black hole never became ready');assert(solar,'handoff did not reach a visible Solar System');assert.deepEqual(errors,[]);
  const gaps=await frame.evaluate(()=>qaGaps),handoffGaps=gaps.filter(g=>g.at>=enteredAt-1000&&g.at<=solar.time+100);
  const maxGap=handoffGaps.length?handoffGaps.reduce((m,g)=>Math.max(m,g.gap),0):null;
  if(!delayed&&maxGap!==null)assert(maxGap<2500,'main-thread heartbeat stalled for over 2.5 seconds during handoff');
  const report={browser:browserName,mode:delayed?'held-atlas controlled-clock':'normal real-time playback',waiting,blackHolePhases:phases.size,backgroundStarPositions:starPositions.size,allocations,
    maxHeartbeatGapMs:maxGap,solar,errors,physicalIPhone:false};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log('PASS',report.mode,'BH → Solar; maximum heartbeat gap',maxGap);
 }finally{if(release)release();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
