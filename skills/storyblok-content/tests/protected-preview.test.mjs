import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const file = new URL('../scripts/lib/protected-preview.mjs', import.meta.url);
const now = 1800000000000;
const signature = 'a'.repeat(40);
const signedUrl = `https://easymailing.com/blog/test?_storyblok=123&_storyblok_tk%5Bspace_id%5D=310467&_storyblok_tk%5Btimestamp%5D=${now/1000}&_storyblok_tk%5Btoken%5D=${signature}`;
const payload = '<script type="application/json" id="__NUXT_DATA__">[{"$sisPreview":1},true]</script>';
const response = body => `HTTP/1.1 200 Connection established\r\n\r\nHTTP/2 200\r\nContent-Type: text/html; charset=utf-8\r\nCache-Control: no-store, private\r\n\r\n<html>${payload}${body}</html>`;
async function core() { assert.ok(existsSync(file), 'protected preview transport is missing'); return import(file); }
test('accepts private draft and removes actual signature from HTML, JSON and URL variants', async () => {
 const { snapshotFromResponse } = await core();
 const body=`<a href="${signedUrl.replaceAll('&','&amp;')}">draft</a><script>${JSON.stringify({query:signature,url:encodeURIComponent(signedUrl)})}</script>`;
 const s=snapshotFromResponse({signedUrl,response:response(body),now});
 assert.equal(s.cleanUrl,'https://easymailing.com/blog/test');
 assert.equal(s.previewVerified,true); assert.ok(!s.html.includes(signature)); assert.ok(!s.html.includes('_storyblok_tk'));
 assert.equal(s.expiresAt,now+600000);
});
test('rejects published HTML even when it contains a textual preview=true decoy',async()=>{
 const { snapshotFromResponse }=await core();
 const r=response('<p>isPreview=true</p>').replace('},true]','},false]');
 assert.throws(()=>snapshotFromResponse({signedUrl,response:r,now}),/Protected preview unavailable/);
});
test('rejects redirects, non-private responses, invalid origin and exhausted signature',async()=>{
 const { snapshotFromResponse }=await core();
 for(const args of [
  {response:response('').replace('HTTP/2 200','HTTP/2 302')},
  {response:response('').replace('no-store, private','public')},
  {signedUrl:signedUrl.replace('easymailing.com','evil.example')},
  {signedUrl:signedUrl.replace(String(now/1000),String(now/1000-3590))},
  {signedUrl:signedUrl+'&_storyblok=999'},
 ])assert.throws(()=>snapshotFromResponse({signedUrl,response:response(''),now,...args}),/Protected preview unavailable/);
});
test('rejects a protected sentinel in upstream HTML before browser delivery',async()=>{
 const { snapshotFromResponse }=await core();
 assert.throws(()=>snapshotFromResponse({signedUrl,response:response('oc-sent-v2.ciphertext.end'),now}),/Protected preview unavailable/);
});
test('restricts slugs and the exact managed CDP endpoint',async()=>{
 const { cleanSlug, validateCdp }=await core();
 assert.equal(cleanSlug('blog/alternativa-a-mailjet'),'blog/alternativa-a-mailjet');
 for(const s of ['../secret','blog/a?token=x','https://evil.example','blog//a','a#x','%2e%2e/a'])assert.throws(()=>cleanSlug(s));
 const good={profile:'openclaw',running:true,cdpReady:true,cdpUrl:'http://127.0.0.1:18800'};
 assert.equal(validateCdp(good),good.cdpUrl);
 for(const cdpUrl of ['http://localhost:18800','http://127.0.0.1:22','http://u:p@127.0.0.1:18800','http://127.0.0.1:18800?x','https://evil.example'])assert.throws(()=>validateCdp({...good,cdpUrl}));
});
test('clean worker environment does not inherit credential, proxy or Node injection variables',async()=>{
 const { workerEnvironment }=await core();
 const e=workerEnvironment({PATH:'/bin',HOME:'/home/test',TMPDIR:'/tmp',HTTPS_PROXY:'proxy-credential',STORYBLOK_MANAGEMENT_TOKEN:'secret',NODE_OPTIONS:'--require pwn.js',OTHER_API_KEY:'private'});
 assert.deepEqual(e,{PATH:'/bin',HOME:'/home/test',TMPDIR:'/tmp'});
});
test('never serves a public fallback or other documents from the preview context',async()=>{
 const { documentRequestAllowed }=await core();
 const clean='https://easymailing.com/blog/test';
 assert.equal(documentRequestAllowed('GET',clean,clean),true);
 assert.equal(documentRequestAllowed('GET',clean+'#faq',clean),true);
 for(const [method,url] of [['POST',clean],['GET',clean+'?preview_secret=x'],['GET','https://easymailing.com/blog/other'],['GET','https://evil.example']]) assert.equal(documentRequestAllowed(method,url,clean),false);
});
test('rejects encoded signature residues that would become readable after JSON/HTML/URL decoding',async()=>{
 const { snapshotFromResponse }=await core();
 for(const [index,encoded] of ['\\u0061'.repeat(40),'&#97;'.repeat(40),'&#x61;'.repeat(40),'%61'.repeat(40),'%2561'.repeat(40),'\\x61'.repeat(40)].entries()) {
  assert.throws(()=>snapshotFromResponse({signedUrl,response:response(`<script>${JSON.stringify({capability:encoded})}</script>`),now}),/Protected preview unavailable/,'encoded fixture '+index);
 }
});
test('a redirect body cannot impersonate an HTTP header block',async()=>{
 const { snapshotFromResponse }=await core();
 const forged='HTTP/2 302\r\nLocation: https://evil.example\r\n\r\n'+response('');
 assert.throws(()=>snapshotFromResponse({signedUrl,response:forged,now}),/Protected preview unavailable/);
});
test('high-resolution captures cannot write outside vault or through symlinks',async()=>{
 const { captureLocation }=await core();
 const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'preview-capture-test-'));
 try {
  const vault=path.join(home,'marcos-vault');fs.mkdirSync(vault);
  const image=path.join(vault,'draft.png');assert.equal(captureLocation(image,home),path.join(fs.realpathSync(vault),'draft.png'));
  assert.throws(()=>captureLocation(path.join(home,'other.png'),home));
  assert.throws(()=>captureLocation(path.join(vault,'config.json'),home));
  fs.symlinkSync(path.join(home,'other.png'),image);assert.throws(()=>captureLocation(image,home));
 } finally {fs.rmSync(home,{recursive:true,force:true});}
});
test('capture writes are exclusive and never overwrite a late file or symlink',async()=>{
 const { saveCapture }=await core();
 const fs=await import('node:fs');const os=await import('node:os');const path=await import('node:path');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'preview-write-test-'));
 try {
  const vault=path.join(home,'marcos-vault');fs.mkdirSync(vault);
  const target=path.join(vault,'new.png'),buffer=Buffer.from('fixture screenshot');
  await saveCapture(target,buffer,home);assert.equal(fs.readFileSync(target).toString(),buffer.toString());
  await assert.rejects(saveCapture(target,Buffer.from('overwrite'),home));
  assert.equal(fs.readFileSync(target).toString(),buffer.toString());
  const outside=path.join(home,'outside.txt');fs.writeFileSync(outside,'untouched');
  const link=path.join(vault,'late.png');fs.symlinkSync(outside,link);
  await assert.rejects(saveCapture(link,buffer,home));assert.equal(fs.readFileSync(outside).toString(),'untouched');
 } finally {fs.rmSync(home,{recursive:true,force:true});}
});
