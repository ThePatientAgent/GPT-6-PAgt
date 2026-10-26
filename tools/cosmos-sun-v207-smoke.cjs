/* Run with Playwright installed: node tools/cosmos-sun-v207-smoke.cjs
 * --root DIR: serve these static bytes through Playwright routing (no web server).
 * --output DIR --viewport mobile|desktop --baseline --record --assets DIR
 * Optional COSMOS_CHROMIUM_EXECUTABLE and COSMOS_CHROMIUM_LEGACY=1.
 * The native tour and its clocks are exercised without changing production code.
 */
const playwright=require(process.env.COSMOS_PLAYWRIGHT_MODULE||'playwright');
const browserName=process.env.COSMOS_BROWSER||'chromium';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const args=process.argv.slice(2),value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const root=path.resolve(value('--root',path.join(__dirname,'../docs')));
const liveUrl=value('--url','');
const output=path.resolve(value('--output','cosmos-sun-qa'));
const assets=value('--assets','');
const mobile=value('--viewport','mobile')==='mobile',baseline=args.includes('--baseline'),record=args.includes('--record');
const launch={headless:true,args:browserName==='chromium'?['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]};
if(browserName==='chromium'&&process.env.COSMOS_CHROMIUM_EXECUTABLE)launch.executablePath=process.env.COSMOS_CHROMIUM_EXECUTABLE;
if(browserName==='webkit'&&process.env.COSMOS_WEBKIT_EXECUTABLE)launch.executablePath=process.env.COSMOS_WEBKIT_EXECUTABLE;
if(browserName==='chromium'&&process.env.COSMOS_CHROMIUM_LEGACY==='1'){
  launch.ignoreDefaultArgs=['--headless'];launch.args.push('--headless=old','--single-process','--no-zygote');
}
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await playwright[browserName].launch(launch);
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},
    deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,
    ...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 Version/18.2 Mobile/15E148 Safari/604.1'}:{})});
  const errors=[],consoleErrors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  if(!liveUrl)await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname==='cosmos.test'){
      const file=path.join(root,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
      if(fs.existsSync(file))await route.fulfill({path:file});
      else await route.fulfill({status:404,body:'Missing '+u.pathname});
    }else if(assets&&u.pathname.endsWith('/earth_atmos_2048.jpg')){
      await route.fulfill({path:path.resolve(assets,'earth.jpg'),headers:{'access-control-allow-origin':'*'}});
    }else if(assets&&u.pathname.endsWith('/ne_110m_land.geojson')){
      await route.fulfill({path:path.resolve(assets,'land.json'),contentType:'application/json',headers:{'access-control-allow-origin':'*'}});
    }else await route.abort();
  });
  const epoch=new Date('2026-10-26T12:00:00Z');
  await page.clock.install({time:epoch});await page.clock.pauseAt(epoch.getTime()+100);
  await page.goto(liveUrl||'http://cosmos.test/',{waitUntil:'load',timeout:90000});
  const frame=page.frames().find(f=>f.url().includes('v085-final'));
  assert(frame,'embedded universe missing');
  const info=()=>frame.evaluate(()=>{
    const sun=document.querySelector('.cosmos-sun-v207')||document.querySelector('.molten-sun-v206');
    const bh=document.getElementById('cosmos-tour-blackhole-v061');
    const box=sun.getBoundingClientRect();
    return {name:document.getElementById('tourName').textContent,
      step:document.getElementById('tourStep').textContent,touring:document.body.classList.contains('touring'),
      sunOpacity:+sun.style.opacity,sunRect:{x:box.x,y:box.y,width:box.width,height:box.height},
      sunTransform:sun.style.transform,sunRenderer:sun.dataset.renderer,
      bhHidden:bh.hidden,bhSource:document.getElementById('cosmos-hole-visit-frame').getAttribute('src'),
      curtainHidden:document.getElementById('cosmos-tour-curtain-v066').hidden,
      planets:[...document.querySelectorAll('.solar-earth,.solar-saturn-ring,.local-satellite,.solar-planet-label,.orbit-half')]
        .map(e=>({class:e.className,text:e.classList.contains('solar-planet-label')?e.textContent:'',style:e.getAttribute('style')}))};
  });
  const stages=[],snapshots=[],bhChecks=[];
  let solarCaptured=false,ended=false,elapsed=0,last='';
  for(let i=0;i<170;i++){
    await page.clock.runFor(250);elapsed+=250;
    const s=await info();
    if(s.name!==last){stages.push(s.name);console.log('STAGE',s.name,elapsed);last=s.name;}
    if(s.name==='Black Hole'&&!s.bhHidden){
      const child=page.frames().find(f=>f.url().includes('cosmos-black-hole-radiance-v013'));
      if(child){
        const data=await child.locator('#scene').evaluate(e=>({...e.dataset}));
        bhChecks.push(data);
        if(bhChecks.length===2)await page.screenshot({path:path.join(output,'black-hole.png')});
      }
    }
    if(!solarCaptured&&s.name==='Solar system'&&s.bhHidden&&s.sunOpacity>.8){
      assert(s.curtainHidden,'black-hole travel curtain still covers solar system');
      if(!baseline)assert.equal(s.sunRenderer,'webgl-domain-warped-plasma');
      if(record){
        const dir=path.join(output,'frames');fs.mkdirSync(dir,{recursive:true});
        for(let f=0;f<120;f++){
          if(f){const dt=f%3===1?34:33;await page.clock.runFor(dt);elapsed+=dt;}
          const bytes=await page.screenshot({path:path.join(dir,`frame-${String(f).padStart(4,'0')}.png`)});
          if(f===54){fs.writeFileSync(path.join(output,'solar.png'),bytes);snapshots.push(await info());}
        }
      }else{
        await page.clock.runFor(1800);elapsed+=1800;
        await page.screenshot({path:path.join(output,'solar.png')});snapshots.push(await info());
      }
      const solar=await info();
      assert(solar.bhHidden,'black-hole iframe reappeared');
      const glCheck=await frame.locator(baseline?'.solar-sun canvas':'.cosmos-sun-v207 canvas').first().evaluate(e=>{
        const gl=e.getContext('webgl');return gl?{error:gl.getError(),width:e.width,height:e.height}:null;
      });
      if(!baseline)assert.equal(glCheck.error,0,'solar WebGL error');
      snapshots.push({...solar,gl:glCheck});solarCaptured=true;
      console.log('SOLAR',solar.sunRect,glCheck);
    }
    if(solarCaptured&&s.name==='Galactic core'&&s.touring){
      await page.screenshot({path:path.join(output,'galactic-center.png')});
    }
    if(stages.includes('Galactic core')&&!s.touring){ended=true;break;}
  }
  assert(solarCaptured,'tour never reached the visible Sun');
  assert(ended,'tour did not complete');
  assert.deepEqual(stages,['Pleiades','Orion','Black Hole','Solar system','Galactic core']);
  assert(bhChecks.some(e=>e.ready==='true'&&e.geometry==='identity'&&e.radiance==='source-synchronous'),'approved V13 renderer not verified');
  assert(new Set(bhChecks.map(e=>e.phase)).size>1,'black-hole animation failed to advance');
  assert.deepEqual(errors,[],'JavaScript errors');
  // Retain coverage of the separate manual V13 entry as well as the guided visit.
  const manualUrl=new URL(liveUrl||'http://cosmos.test/');manualUrl.searchParams.set('scene','black-hole');
  await page.goto(manualUrl.href,{waitUntil:'load',timeout:90000});
  await page.clock.runFor(500);
  const manualFrame=page.frames().find(f=>f.url().includes('cosmos-black-hole-radiance-v013'));
  assert(manualFrame,'manual black-hole iframe missing');
  const manualBefore=await manualFrame.locator('#scene').evaluate(e=>({...e.dataset}));
  assert.equal(manualBefore.ready,'true');assert.equal(manualBefore.geometry,'identity');
  assert.equal(manualBefore.radiance,'source-synchronous');assert.equal(manualBefore.prepared,'48');
  await page.clock.runFor(1300);
  const manualAfter=await manualFrame.locator('#scene').evaluate(e=>({...e.dataset}));
  assert.notEqual(manualBefore.phase,manualAfter.phase,'manual black-hole playback stalled');
  await page.screenshot({path:path.join(output,'black-hole-manual.png')});
  console.log('PASS manual V13',manualBefore.phase,'→',manualAfter.phase);
  const report={browser:browserName,url:liveUrl||'local repository files',viewport:mobile?'390x844 @2x':'1440x900 @1x',baseline,stages,ended,elapsed,
    snapshots,bhChecks,manualBefore,manualAfter,errors,consoleErrors,clock:'deterministic; captures do not measure device FPS'};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));
  console.log('PASS',report.viewport,stages.join(' → '));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
