import { pathToFileURL } from 'node:url';
import { documentRequestAllowed, draftState, MAX_HTML_BYTES, validateCdp } from './lib/protected-preview.mjs';
let context;
async function stop(code=0) { try { await context?.close(); } catch {} process.exit(code); }
process.on('SIGTERM',()=>void stop()); process.on('SIGINT',()=>void stop());
try {
 let input=''; for await (const chunk of process.stdin) {input+=chunk; if(Buffer.byteLength(input)>MAX_HTML_BYTES+8192) throw new Error();}
 const snapshot=JSON.parse(input); input='';
 const {html,cleanUrl,expiresAt,cdpUrl}=snapshot;
 validateCdp({profile:'openclaw',running:true,cdpReady:true,cdpUrl});
 const url=new URL(cleanUrl);
 if(url.origin!=='https://easymailing.com' || url.search || url.hash || !draftState(html) || /oc-sent-v2|preview_secret|_storyblok_tk/i.test(html) || expiresAt<=Date.now() || expiresAt>Date.now()+600000) throw new Error();
 const {chromium}=await import(pathToFileURL('/opt/homebrew/lib/node_modules/openclaw/node_modules/playwright-core/index.mjs').href);
 const browser=await chromium.connectOverCDP(cdpUrl,{timeout:15000,noDefaults:true});
 browser.on('disconnected',()=>process.exit(1));
 // Playwright creates this Chromium context with disposeOnDetach:true.
 // Losing our connection therefore discards only our isolated context.
 context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000},locale:'es-ES'});
 const page=await context.newPage();
 context.on('page',p=>{if(p!==page)void p.close();});
 setTimeout(()=>void stop(),Math.max(1,expiresAt-Date.now()));
 page.on('framenavigated',frame=>{
  if(frame===page.mainFrame() && !documentRequestAllowed('GET',page.url(),cleanUrl)) void stop();
 });
 await context.route('**/*',async route=>{
  const req=route.request();
  try {
   if(Date.now()>=expiresAt || req.method()!=='GET') return await route.abort();
   if(req.isNavigationRequest()) {
    if(req.frame()!==page.mainFrame() || !documentRequestAllowed(req.method(),req.url(),cleanUrl)) return await route.abort();
    return await route.fulfill({status:200,contentType:'text/html; charset=utf-8',headers:{'cache-control':'no-store, private','x-robots-tag':'noindex','referrer-policy':'no-referrer'},body:html});
   }
   return await route.continue();
  } catch { try {await route.abort();} catch {} }
 });
 await page.goto(cleanUrl,{waitUntil:'domcontentloaded',timeout:20000});
 await page.waitForFunction(()=>{
  const payload=document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.payload || window.__NUXT__;
  return payload?.state?.['$sisPreview']===true;
 },null,{timeout:15000});
 if(page.url()!==cleanUrl) throw new Error();
 const cdp=await context.newCDPSession(page);
 const {targetInfo}=await cdp.send('Target.getTargetInfo'); await cdp.detach();
 process.stdout.end(JSON.stringify({profile:'openclaw',targetId:targetInfo.targetId,cleanUrl,fetchedAt:snapshot.fetchedAt,expiresAt,previewVerified:true})+'\n');
 page.on('close',()=>void stop());
} catch { process.stdout.end('{"error":"Protected preview unavailable"}\n'); await stop(1); }
