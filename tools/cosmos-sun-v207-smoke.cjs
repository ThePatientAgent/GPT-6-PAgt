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
async function checkSolarOrientation(page){
 try{
  await page.setContent('<body style="margin:0;background:#000"></body>');
  await page.addScriptTag({path:path.join(root,'cosmos-sun-v207.js')});
  const checks=[];
  for(const mode of ['webgl','reduced-motion','fallback']){
   await page.emulateMedia({reducedMotion:mode==='webgl'?'no-preference':'reduce'});
   const check=await page.evaluate(mode=>{
    const host=document.createElement('div');host.style.cssText='width:384px;height:384px';document.body.appendChild(host);
    const renderer=new CosmosSolarRenderer(host);if(mode==='fallback')renderer.fallback();
    const cameras=[{right:[1,0,0],up:[0,1,0],forward:[0,0,1]},
      {right:[0,0,-1],up:[0,1,0],forward:[1,0,0]},
      {right:[1,0,0],up:[0,.5,-Math.sqrt(.75)],forward:[0,Math.sqrt(.75),.5]}];
    let sampleTime=1000;
    const sample=camera=>{
     // Keep plasma time fixed, allowing the low-power fallback its normal 15 Hz cadence.
     if(mode==='fallback')sampleTime+=80;
     renderer.project(384,true,camera);renderer.draw(sampleTime);
     const canvas=renderer.fallbackCanvas||renderer.canvas;
     const pixels=new Uint8Array(canvas.width*canvas.height*4);
     if(renderer.fallbackCanvas)pixels.set(renderer.context.getImageData(0,0,canvas.width,canvas.height).data);
     else renderer.gl.readPixels(0,0,canvas.width,canvas.height,renderer.gl.RGBA,renderer.gl.UNSIGNED_BYTE,pixels);
     return {pixels,image:canvas.toDataURL(),width:canvas.width,height:canvas.height};
    };
    const first=sample(cameras[0]),repeat=sample(cameras[0]),yaw=sample(cameras[1]),pitch=sample(cameras[2]),back=sample(cameras[0]);
    const difference=(a,b)=>{let rgb=0,alpha=0;for(let i=0;i<a.length;i+=4){rgb+=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);alpha+=a[i+3]!==b[i+3];}return {meanRGB:rgb/(a.length/4*3),alphaPixelsChanged:alpha};};
    const result={mode,width:first.width,height:first.height,repeat:difference(first.pixels,repeat.pixels),
      yaw:difference(first.pixels,yaw.pixels),pitch:difference(first.pixels,pitch.pixels),back:difference(first.pixels,back.pixels),
      cornerAlpha:first.pixels[3],glError:renderer.gl?.getError(),images:{front:first.image,yaw:yaw.image,pitch:pitch.image}};
    renderer.gl?.getExtension('WEBGL_lose_context')?.loseContext();host.remove();return result;
   },mode);
   assert.equal(check.repeat.meanRGB,0,'frozen surface must be deterministic');
   assert(check.yaw.meanRGB>3&&check.pitch.meanRGB>3,'camera rotation must reveal different surface pixels');
   assert.equal(check.back.meanRGB,0,'returning the camera must restore the same hemisphere');
   assert.equal(check.yaw.alphaPixelsChanged,0,'rotation must preserve the solar silhouette and corona');
   assert.equal(check.pitch.alphaPixelsChanged,0);assert.equal(check.cornerAlpha,0);assert.equal(check.glError,0);
   for(const [view,image]of Object.entries(check.images))fs.writeFileSync(path.join(output,`sun-${mode}-${view}.png`),Buffer.from(image.split(',')[1],'base64'));
   delete check.images;checks.push(check);
  }
  return checks;
 }finally{await page.emulateMedia({reducedMotion:'no-preference'});}
}
(async()=>{
 const browser=await playwright[browserName].launch(launch);
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},
    deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,
    ...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 Version/18.2 Mobile/15E148 Safari/604.1'}:{})});
  const orientationPixels=!baseline&&!liveUrl?await checkSolarOrientation(page):null;
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
  const stages=[],snapshots=[],bhChecks=[],hintChecks=[];let solarDrag=null;
  let solarCaptured=false,pleiadesCaptured=false,pleiadesCheck=null,ended=false,elapsed=0,last='';
  const deepChecks={},seenPlanets=new Set();let orbitCheck=null;
  for(let i=0;i<170;i++){
    await page.clock.runFor(250);elapsed+=250;
    const s=await info();
    if(!baseline&&elapsed===500){if(mobile)await page.touchscreen.tap(60,300);await page.mouse.move(70,320);await page.mouse.down();await page.mouse.move(140,340,{steps:3});await page.mouse.up();assert((await info()).touring,'touch/drag must not stop the automatic tour');}
    if(s.name!==last){
      stages.push(s.name);console.log('STAGE',s.name,elapsed);last=s.name;
      if(!baseline){
        const hint=await frame.evaluate(()=>{const e=document.getElementById('touchRotateHint'),r=e.getBoundingClientRect(),stop=document.getElementById('tourToggle').getBoundingClientRect();return {text:e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,stopLeft:stop.left,visible:!e.hidden};});
        assert.equal(hint.text,s.name==='Black Hole'?'↔ Drag to move the stars':'↔ Touch & drag to rotate');
        assert(hint.visible&&hint.left>=0&&hint.top>=0&&hint.right+5<hint.stopLeft,'English hint must fit beside Stop Tour');hintChecks.push({stage:s.name,...hint});
      }
    }
    if(!baseline&&s.name==='Solar system'&&s.sunOpacity>.5){
      const names=await frame.evaluate(()=>{
        const sun=document.querySelector('.cosmos-sun-v207').getBoundingClientRect(),sx=sun.x+sun.width/2,sy=sun.y+sun.height/2;
        const bodies=[['EARTH',document.querySelector('.solar-earth')],['SATURN',document.querySelector('.cosmos-v096-saturn')],['NEPTUNE',document.querySelectorAll('.local-satellite')[3]]];
        return bodies.filter(([name,e])=>{if(!e||+e.style.opacity<.1)return false;const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
          const hiddenBySun=+e.style.zIndex<91&&Math.hypot(x-sx,y-sy)<sun.width/4;
          return !hiddenBySun&&x>0&&x<innerWidth&&y>65&&y<innerHeight-65;}).map(([name])=>name);
      });
      names.forEach(n=>seenPlanets.add(n));
    }
    if(!baseline&&!pleiadesCaptured&&s.name==='Pleiades'&&elapsed>=3500){
      const nebula=frame.locator('.cosmos-pleiades-v211');
      const data=await nebula.evaluate(e=>({renderer:e.dataset.renderer,phase:e.dataset.phase,
        visible:getComputedStyle(e).display!=='none',error:e.getContext('webgl').getError()}));
      assert.equal(data.renderer,'webgl-volume-reflection-nebula');assert(data.visible);assert(+data.phase>0);assert.equal(data.error,0);
      await page.screenshot({path:path.join(output,'pleiades.png')});
      console.log('PLEIADES',data);pleiadesCaptured=true;pleiadesCheck=data;
    }
    if(!baseline&&((s.name==='Orion'&&elapsed>=8250)||(s.name==='Galactic core'&&elapsed>=21000))&&!deepChecks[s.name]){
      const expectedMode=s.name==='Orion'?'webgl-ionized-orion':'webgl-luminous-galactic-core';
      if(!await frame.locator('.cosmos-deep-v212').evaluate((e,mode)=>e.dataset.renderer===mode&&getComputedStyle(e).display!=='none',expectedMode))continue;
      const data=await frame.locator('.cosmos-deep-v212').evaluate(e=>({renderer:e.dataset.renderer,phase:e.dataset.phase,
        visible:getComputedStyle(e).display!=='none',error:e.getContext('webgl').getError()}));
      assert.equal(data.renderer,s.name==='Orion'?'webgl-ionized-orion':'webgl-luminous-galactic-core');
      assert(data.visible);assert(+data.phase>0);assert.equal(data.error,0);deepChecks[s.name]=data;
      await page.screenshot({path:path.join(output,s.name==='Orion'?'orion.png':'galactic-core.png')});console.log('DEEP',s.name,data);
    }
    if(s.name==='Black Hole'&&!s.bhHidden){
      const child=page.frames().find(f=>f.url().includes('cosmos-black-hole-radiance-v013'));
      if(child){
        const data=await child.locator('#scene').evaluate(e=>({...e.dataset}));
        if(!baseline&&data.ready==='true'){
          assert.equal(data.renderer,'webgl-differential-accretion');assert.equal(data.flow,'shape-locked-orbital-filaments');
          assert.equal(data.preparation,'prebaked-lossless');assert.equal(data.frameTextures,'2');
          assert.equal(await child.locator('#scene').evaluate(e=>e.getContext('webgl').getError()),0);
        }
        bhChecks.push(data);
        if(bhChecks.length===2)await page.screenshot({path:path.join(output,'black-hole.png')});
      }
    }
    if(!solarCaptured&&s.name==='Solar system'&&s.bhHidden&&s.sunOpacity>.8){
      assert(s.curtainHidden,'black-hole travel curtain still covers solar system');
      if(!baseline)assert.equal(s.sunRenderer,'webgl-domain-warped-plasma');
      if(!baseline){
        const orientation=()=>frame.locator('.cosmos-sun-v207 canvas').first().evaluate(e=>{const gl=e.getContext('webgl'),program=gl.getParameter(gl.CURRENT_PROGRAM);return [...gl.getUniform(program,gl.getUniformLocation(program,'u_view_to_world'))];});
        const before=await orientation();
        const drag=async dx=>{
          const r=await frame.locator('.cosmos-sun-v207').boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
          if(mobile&&browserName==='chromium'){
            const cdp=await page.context().newCDPSession(page);
            await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y}]});
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
          }else if(mobile){
            await frame.evaluate(({x,y,dx})=>{const target=document.elementFromPoint(x,y);for(const [type,px]of [['touchstart',x],['touchmove',x+dx],['touchend',x+dx]]){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'changedTouches',{value:[{identifier:220,target,clientX:px,clientY:y}]});target.dispatchEvent(e);}}, {x,y,dx});
          }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:3});await page.mouse.up();}
          await page.clock.runFor(80);elapsed+=80;
        };
        await drag(60);const after=await orientation();await drag(-60);const restored=await orientation();
        const delta=Math.max(...after.map((v,i)=>Math.abs(v-before[i])));
        assert(delta>.10,'dragging the Sun must rotate its actual shader orientation');assert((await info()).touring,'dragging the Sun must not stop the tour');
        solarDrag={input:mobile?'touch':'mouse',before,after,restored,delta};console.log('SOLAR DRAG',solarDrag.input,delta);
      }
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
      if(!baseline){
        orbitCheck=await frame.evaluate(()=>{
          const svg=document.querySelector('.cosmos-solar-orbits-v212'),mask=svg.querySelector('mask'),shadow=svg.querySelector('circle');
          const bodies=[['EARTH',document.querySelector('.solar-earth')],['SATURN',document.querySelector('.cosmos-v096-saturn')],['NEPTUNE',document.querySelectorAll('.local-satellite')[3]]];
          const distances=bodies.map(([name,body])=>{const r=body.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;let nearest=Infinity;
            for(const path of svg.querySelectorAll('path[data-body="'+name+'"]')){const length=path.getTotalLength();for(let t=0;t<=length;t+=1.5){const p=path.getPointAtLength(t);nearest=Math.min(nearest,Math.hypot(x-p.x,y-p.y));}}
            return {name,x,y,error:nearest};});
          const sun=document.querySelector('.cosmos-sun-v207').getBoundingClientRect();
          return {model:svg.dataset.model,visible:getComputedStyle(svg).display!=='none',maskX:mask.getAttribute('x'),maskY:mask.getAttribute('y'),
            maskWidth:+mask.getAttribute('width'),maskHeight:+mask.getAttribute('height'),viewport:[innerWidth,innerHeight],shadowRadius:+shadow.getAttribute('r'),sunRadius:sun.width/4,distances};
        });
        assert.equal(orbitCheck.model,'shared-kepler-perspective');assert(orbitCheck.visible);
        assert.equal(orbitCheck.maskX,'0');assert.equal(orbitCheck.maskY,'0');
        assert.deepEqual([orbitCheck.maskWidth,orbitCheck.maskHeight],orbitCheck.viewport);assert(orbitCheck.shadowRadius>orbitCheck.sunRadius);
        orbitCheck.distances.forEach(p=>assert(p.error<1.5,p.name+' must follow its rendered orbit'));
        console.log('ORBITS',orbitCheck.distances);
      }
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
    if(stages.includes('Galactic core')&&(baseline?!s.touring:s.name==='Pleiades'&&s.touring)){ended=true;break;}
  }
  assert(solarCaptured,'tour never reached the visible Sun');
  if(!baseline)assert.equal(Object.keys(deepChecks).length,2,'both new deep scenes must render');
  if(!baseline)assert.deepEqual([...seenPlanets].sort(),['EARTH','NEPTUNE','SATURN'],'all three planets must enter the viewport');
  if(!baseline)assert(pleiadesCaptured,'living reflection nebula was not verified');
  assert(ended,baseline?'tour did not complete':'tour did not restart its next loop');
  assert.deepEqual(stages,baseline?['Pleiades','Orion','Black Hole','Solar system','Galactic core']:['Pleiades','Orion','Black Hole','Solar system','Galactic core','Pleiades']);
  assert(bhChecks.some(e=>e.ready==='true'&&e.geometry==='identity'&&e.radiance==='source-synchronous'),'approved V13 renderer not verified');
  assert(new Set(bhChecks.map(e=>e.phase)).size>1,'black-hole animation failed to advance');
  assert.deepEqual(errors,[],'JavaScript errors');
  // Retain coverage of the separate manual V13 entry as well as the guided visit.
  const manualUrl=new URL(liveUrl||'http://cosmos.test/');manualUrl.searchParams.set('scene','black-hole');
  await page.goto(manualUrl.href,{waitUntil:'load',timeout:90000});
  await page.clock.runFor(500);
  const manualFrame=page.frames().find(f=>f.url().includes('cosmos-black-hole-radiance-v013'));
  assert(manualFrame,'manual black-hole iframe missing');
  for(let attempt=0;attempt<40;attempt++){
    if(await manualFrame.locator('#scene').evaluate(e=>e.dataset.ready==='true'))break;
    await page.clock.runFor(125);
  }
  await page.clock.runFor(250);
  const manualBefore=await manualFrame.locator('#scene').evaluate(e=>({...e.dataset}));
  assert.equal(manualBefore.ready,'true');assert.equal(manualBefore.geometry,'identity');
  assert.equal(manualBefore.radiance,'source-synchronous');assert.equal(manualBefore.prepared,'48');
  if(!baseline){
    assert.equal(manualBefore.renderer,'webgl-differential-accretion');
    assert.equal(await manualFrame.locator('#scene').evaluate(e=>e.getContext('webgl').getError()),0);
  }
  let manualDrag=null;
  if(!baseline){
    const pan=()=>manualFrame.locator('#cosmos-stellar-backdrop-v218').evaluate(e=>({x:+e.dataset.panX,y:+e.dataset.panY}));
    const before=await pan();
    await page.mouse.move(90,350);await page.mouse.down();await page.mouse.move(155,370,{steps:3});await page.mouse.up();await page.clock.runFor(80);
    const afterMouse=await pan();assert(Math.abs(afterMouse.x-before.x-65)<1&&Math.abs(afterMouse.y-before.y-20)<1,'manual entry must accept mouse dragging');
    await manualFrame.evaluate(()=>{
      const target=document.elementFromPoint(155,370);
      for(const [type,x,y]of [['touchstart',155,370],['touchmove',110,340],['touchend',110,340]]){
        const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'changedTouches',{value:[{identifier:219,target,clientX:x,clientY:y}]});target.dispatchEvent(e);
      }
    });await page.clock.runFor(80);
    const afterTouch=await pan();assert(Math.abs(afterTouch.x-afterMouse.x+45)<1&&Math.abs(afterTouch.y-afterMouse.y+30)<1,'manual entry must accept touch dragging');
    manualDrag={before,afterMouse,afterTouch};
  }
  await page.clock.runFor(1300);
  const manualAfter=await manualFrame.locator('#scene').evaluate(e=>({...e.dataset}));
  assert.notEqual(manualBefore.phase,manualAfter.phase,'manual black-hole playback stalled');
  await page.screenshot({path:path.join(output,'black-hole-manual.png')});
  console.log('PASS manual V13',manualBefore.phase,'→',manualAfter.phase);
  const report={browser:browserName,url:liveUrl||'local repository files',viewport:mobile?'390x844 @2x':'1440x900 @1x',baseline,stages,ended,elapsed,orientationPixels,solarDrag,hintChecks,
    snapshots,pleiadesCheck,deepChecks,orbitCheck,seenPlanets:[...seenPlanets],bhChecks,manualBefore,manualAfter,manualDrag,errors,consoleErrors,clock:'deterministic; captures do not measure device FPS'};
  fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2));
  console.log('PASS',report.viewport,stages.join(' → '));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
