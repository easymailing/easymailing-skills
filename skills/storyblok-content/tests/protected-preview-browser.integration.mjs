// Operator-only regression on the Mac Mini's existing managed Chrome. No CMS writes.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { workerEnvironment } from '../scripts/lib/protected-preview.mjs';
const endpoint='http://127.0.0.1:18800';
const {chromium}=await import('/opt/homebrew/lib/node_modules/openclaw/node_modules/playwright-core/index.mjs');
const browser=await chromium.connectOverCDP(endpoint,{noDefaults:true});
const session=await browser.newBrowserCDPSession();
const targets=async()=>new Map((await session.send('Target.getTargets')).targetInfos.filter(t=>t.type==='page').map(t=>[t.targetId,t]));
const initial=await targets();
const workerFile=fileURLToPath(new URL('../scripts/preview-browser-worker.mjs',import.meta.url));
const cleanUrl='https://easymailing.com/blog/preview-regression-fixture';
const html='<html><body><div id="__nuxt">draft fixture</div><script id="__NUXT_DATA__" type="application/json">[{"$sisPreview":1},true]</script><script>window.__NUXT__={state:{"$sisPreview":true}}</script></body></html>';
const workers=[];
async function start(ttl) {
 const child=spawn(process.execPath,[workerFile],{env:workerEnvironment(process.env),stdio:['pipe','pipe','ignore']});workers.push(child);
 const ready=await new Promise((resolve,reject)=>{
  let data=''; const timer=setTimeout(()=>reject(new Error('Worker readiness timeout')),20000);
  child.stdout.on('data',chunk=>{data+=chunk;if(data.includes('\n')){clearTimeout(timer);resolve(JSON.parse(data.split('\n')[0]));}});
  child.on('error',reject);child.stdin.end(JSON.stringify({html,cleanUrl,cdpUrl:endpoint,fetchedAt:Date.now(),expiresAt:Date.now()+ttl}));
 });
 assert.ok(ready.previewVerified);return {child,ready};
}
async function absent(id) {
 for(let i=0;i<50;i++) {if(!(await targets()).has(id))return;await new Promise(r=>setTimeout(r,100));}
 throw new Error('Owned context was not removed');
}
try {
 const first=await start(30000);
 const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()===cleanUrl);
 assert.ok(page,'Isolated context visible to another CDP connection');
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.evaluate(()=>window.__NUXT__.state.$sisPreview),true);
 const postBlocked=await page.evaluate(async()=>{try{await fetch(location.href,{method:'POST',body:'fixture'});return false}catch{return true}});
 assert.equal(postBlocked,true);
 const screenshot=await page.screenshot();assert.ok(screenshot.length>100);
 await page.goto('https://easymailing.com/blog/other').then(()=>assert.fail('Other document allowed'),()=>{});
 assert.equal(page.url(),cleanUrl);
 first.child.kill('SIGKILL');await absent(first.ready.targetId);
 const spa=await start(30000);
 const spaPage=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()===cleanUrl);
 await spaPage.evaluate(()=>history.pushState(null,'','/blog/other')).catch(()=>{});await absent(spa.ready.targetId);
 const second=await start(1500);await absent(second.ready.targetId);
 const final=await targets();
 // Prior live preview contexts may expire independently; normal tabs must survive.
 const defaultContextId=initial.values().next().value?.browserContextId;
 const normal=[...initial.values()].filter(t=>t.browserContextId===defaultContextId && t.url!==cleanUrl);
 assert.ok(normal.every(t=>final.has(t.targetId)),'Pre-existing tabs were closed');
 console.log(JSON.stringify({reloadKeepsDraft:true,postBlocked:true,otherNavigationBlocked:true,screenshot:true,sigkillDisposesContext:true,expiryDisposesContext:true,spaNavigationClosesContext:true,priorTabsPreserved:true}));
} finally {
 for(const child of workers)if(child.exitCode===null)child.kill('SIGTERM');
 await session.detach();
 // Closing a CDP connection detaches; it never shuts down the managed browser.
 await browser.close();
}
