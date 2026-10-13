#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname,join } from 'node:path';
import { cleanSlug,signedPreview,snapshotFromResponse,validateCdp,workerEnvironment,MAX_HTML_BYTES } from './lib/protected-preview.mjs';
const dir=dirname(fileURLToPath(import.meta.url));
let worker;
function capture(command,args,input='',limit=MAX_HTML_BYTES,timeoutMs=45000) {
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:['pipe','pipe','ignore']}); let chunks=[],bytes=0;
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error());},timeoutMs);
  child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>limit){child.kill('SIGKILL');return;}chunks.push(chunk);});
  child.on('error',()=>{clearTimeout(timer);reject(new Error());});
  child.on('close',code=>{clearTimeout(timer);if(code!==0||bytes>limit)reject(new Error());else resolve(Buffer.concat(chunks).toString('utf8'));});
  child.stdin.on('error',()=>{});child.stdin.end(input);
 });
}
process.on('SIGTERM',()=>{worker?.kill('SIGTERM');process.exit(1);});
try {
 if(!process.env.STORYBLOK_MANAGEMENT_TOKEN?.startsWith('oc-sent-v2.') || !process.env.HTTPS_PROXY) throw new Error();
 const slug=cleanSlug(process.argv[2]);
 const signedUrl=(await capture('bash',[join(dir,'preview-url.sh'),slug],'',8192)).trim();
 signedPreview(signedUrl);
 // The signed capability goes to curl exclusively over stdin; never argv/env/disk/browser.
 const response=await capture('curl',['-q','-sS','--compressed','--max-time','35','--include','--config','-'],'url = '+JSON.stringify(signedUrl)+'\n');
 const snapshot=snapshotFromResponse({signedUrl,response});
 let status=JSON.parse(await capture('openclaw',['browser','--browser-profile','openclaw','--json','status'],'',65536));
 if(!status.running || !status.cdpReady) {
  await capture('openclaw',['browser','--browser-profile','openclaw','--json','start'],'',65536);
  status=JSON.parse(await capture('openclaw',['browser','--browser-profile','openclaw','--json','status'],'',65536));
 }
 const cdpUrl=validateCdp(status);
 worker=spawn(process.execPath,[join(dir,'preview-browser-worker.mjs')],{detached:true,env:workerEnvironment(process.env),stdio:['pipe','pipe','ignore']});
 const ready=await new Promise((resolve,reject)=>{
  let output='';const timer=setTimeout(()=>reject(new Error()),45000);
  worker.stdout.on('data',chunk=>{output+=chunk;if(output.length>8192){clearTimeout(timer);reject(new Error());}if(output.includes('\n')){clearTimeout(timer);resolve(JSON.parse(output.split('\n')[0]));}});
  worker.on('error',()=>{clearTimeout(timer);reject(new Error());});
  worker.on('exit',()=>{clearTimeout(timer);reject(new Error());});
  worker.stdin.on('error',()=>{});worker.stdin.end(JSON.stringify({...snapshot,cdpUrl}));
 });
 if(!ready.previewVerified || ready.cleanUrl!==snapshot.cleanUrl || !/^[A-Fa-f0-9]+$/.test(ready.targetId)) throw new Error();
 worker.stdout.destroy();worker.unref();
 process.stdout.write(JSON.stringify(ready)+'\n');
} catch { worker?.kill('SIGTERM');process.stderr.write('Protected preview unavailable\n');process.exitCode=1; }
