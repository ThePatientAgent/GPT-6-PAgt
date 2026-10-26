/* Capture the unmodified five-stop tour at 60 distinct native clock steps/second. */
const fs=require('fs'),path=require('path'),{spawn}=require('child_process'),{once}=require('events'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../docs'),out=path.resolve(process.argv[2]||path.join(root,'media/cosmos-tour-v213-60fps.mp4'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.COSMOS_CHROMIUM_EXECUTABLE,headless:true,
  ...(process.env.COSMOS_CHROMIUM_LEGACY==='1'?{ignoreDefaultArgs:['--headless']}:{}),
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
   ...(process.env.COSMOS_CHROMIUM_LEGACY==='1'?['--headless=old','--single-process','--no-zygote']:[])]});
 let encoder;
 try{
  const page=await browser.newPage({viewport:{width:360,height:640},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='cosmos.test'){
    const file=path.join(root,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
    return fs.existsSync(file)?route.fulfill({path:file}):route.fulfill({status:404,body:'missing'});
   }
   if(u.pathname.endsWith('/earth_atmos_2048.jpg'))return route.fulfill({path:path.resolve(root,'../../analysis/earth.jpg'),headers:{'access-control-allow-origin':'*'}});
   if(u.pathname.endsWith('/ne_110m_land.geojson'))return route.fulfill({path:path.resolve(root,'../../analysis/land.json'),contentType:'application/json',headers:{'access-control-allow-origin':'*'}});
   return route.abort();
  });
  const epoch=new Date('2026-10-27T00:00:00Z');await page.clock.install({time:epoch});await page.clock.pauseAt(+epoch+100);
  await page.goto('http://cosmos.test/',{waitUntil:'load'});const frame=page.frames().find(f=>f.url().includes('v085-final'));assert(frame);
  for(let i=0;i<30;i++){if(await page.locator('iframe.cosmos-ready').count())break;await page.clock.runFor(50);}
  assert(await page.locator('iframe.cosmos-ready').count(),'tour did not reveal');
  const beginning=await frame.evaluate(()=>performance.now());fs.mkdirSync(path.dirname(out),{recursive:true});
  encoder=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate','60','-i','pipe:0',
    '-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-profile:v','high','-level:v','4.2','-movflags','+faststart','-an',out],{stdio:['pipe','ignore','inherit']});
  const done=once(encoder,'close'),stages=[],hashes=new Set(),crypto=require('crypto');let previous='',frames=0,elapsed=0,tail=0;
  for(let f=0;f<2100;f++){
   const target=Math.round(f*1000/60),dt=target-elapsed;if(dt)await page.clock.runFor(dt);elapsed=target;
   const s=await frame.evaluate(()=>({name:document.getElementById('tourName').textContent,touring:document.body.classList.contains('touring')}));
   if(s.name==='Pleiades'&&stages.length===5)break;
   if(s.name!==previous){console.log('STAGE',s.name,elapsed);stages.push({name:s.name,frame:f,timeMs:elapsed});previous=s.name;}
   const jpg=await page.screenshot({type:'jpeg',quality:95,animations:'allow'});hashes.add(crypto.createHash('sha256').update(jpg).digest('hex'));
   if(!encoder.stdin.write(jpg))await once(encoder.stdin,'drain');frames++;
   if(f%120===0)console.log('FRAMES',frames,elapsed);
   if(!s.touring&&stages.length===5){tail++;if(tail>=30)break;}
  }
  encoder.stdin.end();const [code]=await done;assert.equal(code,0);assert.deepEqual(errors,[]);assert.equal(stages.length,5);assert(hashes.size>frames*.98,'too many duplicate frames');
  const report={width:720,height:1280,fps:60,frames,uniqueFrameHashes:hashes.size,duration:frames/60,beginning,stages,errors,
    clock:'Each frame advances the native browser clock by 1/60 second; this is a rendering capture, not a physical iPhone FPS measurement.'};
  fs.writeFileSync(out.replace(/\.mp4$/,'.json'),JSON.stringify(report,null,2));console.log('PASS',JSON.stringify(report));
 }finally{if(encoder&&!encoder.killed)encoder.kill();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
