/* Cached stellar background: no extra WebGL context or continuous draw loop. */
(()=>{
 'use strict';
 const canvas=document.createElement('canvas');canvas.id='cosmos-stellar-backdrop-v218';canvas.setAttribute('aria-hidden','true');
 canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
 const host=document.createElement('div');host.id='cosmos-moving-stars-v218';host.style.cssText='position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none';host.appendChild(canvas);document.body.prepend(host);
 const style=document.createElement('style');style.textContent='@keyframes cosmos-stars-drift-v218{from{transform:translate3d(-12px,-12px,0)}to{transform:translate3d(-84px,-58px,0)}}#cosmos-stellar-backdrop-v218{animation:cosmos-stars-drift-v218 12s linear infinite alternate;will-change:transform}@media(prefers-reduced-motion:reduce){#cosmos-stellar-backdrop-v218{animation:none;transform:translate(-40px,-24px)}}';document.head.appendChild(style);
 const g=canvas.getContext('2d');if(!g)return;
 const tile=document.createElement('canvas');let pending=false,paintRAF=0,width=0,height=0,panX=0,panY=0;
 function present(){
  paintRAF=0;if(!width||!height)return;
  const x=(panX%width+width)%width,y=(panY%height+height)%height;
  // Repeat the cached field, so a long drag never exposes an empty edge.
  for(const px of [x-width,x])for(const py of [y-height,y])g.drawImage(tile,0,0,tile.width,tile.height,px,py,width,height);
  canvas.dataset.panX=panX.toFixed(2);canvas.dataset.panY=panY.toFixed(2);
 }
 function drag(dx,dy){
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  panX+=dx;panY+=dy;if(!paintRAF)paintRAF=requestAnimationFrame(present);
 }
 window.CosmosBlackHoleStars={drag};
 canvas.dataset.interactive='true';
 function draw(){
  pending=false;const w=innerWidth+96,h=innerHeight+96,dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=tile.width=Math.round(w*dpr);canvas.height=tile.height=Math.round(h*dpr);width=w;height=h;canvas.style.width=w+'px';canvas.style.height=h+'px';g.setTransform(dpr,0,0,dpr,0,0);
  const cache=tile.getContext('2d');cache.setTransform(dpr,0,0,dpr,0,0);cache.fillStyle='#000';cache.fillRect(0,0,w,h);
  const box=document.querySelector('main>section').getBoundingClientRect();
  const cx=box.x+box.width*.5,cy=box.y+box.height*214/420,rx=box.width*120/620,ry=box.height*125/420;
  host.style.maskImage=host.style.webkitMaskImage='radial-gradient(ellipse '+rx+'px '+ry+'px at '+cx+'px '+cy+'px,transparent 99%,#000 100%)';
  let seed=2180529;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const count=Math.min(2200,Math.round(w*h/330));
  for(let i=0;i<count;i++){
   let x=random()*w,y=random()*h;
   if(i%3===0){const u=random(),v=random();x=u*w;y=h*(.28+.4*u)+(v-.5)*h*.36;}
   // The fixed host mask occludes the shadow while the cached star texture drifts.
   const bright=random(),radius=bright>.988?1.35:bright>.88?.8:.38+random()*.3,alpha=.18+Math.pow(bright,3)*.65;
   const warm=random()<.17;cache.fillStyle=warm?'rgba(255,213,173,'+alpha+')':'rgba(188,215,255,'+alpha+')';
   cache.beginPath();cache.arc(x,y,radius,0,Math.PI*2);cache.fill();
   if(bright>.988){const halo=cache.createRadialGradient(x,y,0,x,y,5);halo.addColorStop(0,'rgba(174,210,255,.18)');halo.addColorStop(1,'rgba(174,210,255,0)');cache.fillStyle=halo;cache.fillRect(x-5,y-5,10,10);}
  }
  present();canvas.dataset.stars=String(count);canvas.dataset.shadow='occluded';canvas.dataset.ready='true';
 }
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(draw);}};
 // Direct input also works on the standalone Black Hole page.
 let pointer=null,touch=null;
 const isControl=target=>target?.closest?.('a,button,input,select,textarea,[role="button"]');
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||isControl(e.target))return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};try{e.target.setPointerCapture(e.pointerId);}catch{};});
 document.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;drag(e.clientX-pointer.x,e.clientY-pointer.y);pointer.x=e.clientX;pointer.y=e.clientY;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,e=>{if(pointer?.id===e.pointerId)pointer=null;});
 document.addEventListener('touchstart',e=>{if(touch||isControl(e.target))return;const t=e.changedTouches[0];if(!t)return;touch={id:t.identifier,x:t.clientX,y:t.clientY};if(e.cancelable)e.preventDefault();},{passive:false});
 document.addEventListener('touchmove',e=>{if(!touch)return;for(const t of e.changedTouches)if(t.identifier===touch.id){drag(t.clientX-touch.x,t.clientY-touch.y);touch.x=t.clientX;touch.y=t.clientY;}if(e.cancelable)e.preventDefault();},{passive:false});
 for(const event of ['touchend','touchcancel'])document.addEventListener(event,e=>{if(touch&&[...e.changedTouches].some(t=>t.identifier===touch.id))touch=null;});
 addEventListener('blur',()=>{pointer=null;touch=null;});
 addEventListener('resize',schedule);visualViewport?.addEventListener('resize',schedule);draw();
})();
