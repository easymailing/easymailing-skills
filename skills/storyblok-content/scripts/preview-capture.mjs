#!/usr/bin/env node
// Capture the prepared draft at native resolution. OpenClaw media otherwise scales long pages.
import { captureLocation, saveCapture } from './lib/protected-preview.mjs';
import { createHash } from 'node:crypto';
let browser;
try {
 const targetId=process.argv[2],output=captureLocation(process.argv[3],process.env.HOME);
 if(!/^[A-Fa-f0-9]+$/.test(targetId) || (process.argv[4] && process.argv[4]!=='--faq')) throw new Error();
 const {chromium}=await import('/opt/homebrew/lib/node_modules/openclaw/node_modules/playwright-core/index.mjs');
 browser=await chromium.connectOverCDP('http://127.0.0.1:18800',{timeout:10000,noDefaults:true});
 let page;
 for(const candidate of browser.contexts().flatMap(c=>c.pages())) {
  const cdp=await candidate.context().newCDPSession(candidate);
  const info=await cdp.send('Target.getTargetInfo');await cdp.detach();
  if(info.targetInfo.targetId===targetId){page=candidate;break;}
 }
 if(!page) throw new Error();
 const url=new URL(page.url());
 if(url.origin!=='https://easymailing.com' || url.search || url.hash) throw new Error();
 const valid=await page.evaluate(()=>window.__NUXT__?.state?.['$sisPreview']===true && !/preview_secret|_storyblok_tk|oc-sent-v2/i.test(document.documentElement.outerHTML));
 if(!valid) throw new Error();
 const buffer=process.argv[4]==='--faq'
  ? await page.locator('div.border-b.border-gray-200').filter({has:page.locator('h3')}).first().screenshot({type:'png',timeout:10000})
  : await page.screenshot({type:'png',fullPage:true,timeout:20000});
 if(page.url()!==url.href) throw new Error();
 const data=buffer;if(!data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error();
 if(!await page.evaluate(()=>window.__NUXT__?.state?.['$sisPreview']===true))throw new Error();
 await saveCapture(output,data,process.env.HOME);
 console.log(JSON.stringify({path:output,width:data.readUInt32BE(16),height:data.readUInt32BE(20),sha256:createHash('sha256').update(buffer).digest('hex'),targetId,cleanUrl:url.href,previewVerified:true}));
} catch { process.stderr.write('Protected preview capture unavailable\n');process.exitCode=1; }
finally {await browser?.close().catch(()=>{});}
