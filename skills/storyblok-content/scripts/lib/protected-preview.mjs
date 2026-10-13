import { open } from 'node:fs/promises';
import { realpathSync, lstatSync } from 'node:fs';
import { resolve, dirname, join, isAbsolute, sep } from 'node:path';
const unavailable = () => new Error('Protected preview unavailable');
export const MAX_HTML_BYTES = 5 * 1024 * 1024;
export function cleanSlug(slug) {
 if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9/_-]{0,180}$/.test(slug) || slug.includes('//') || slug.endsWith('/')) throw unavailable();
 return slug;
}
export function validateCdp(status) {
 if (status?.profile !== 'openclaw' || !status.running || !status.cdpReady || status.cdpUrl !== 'http://127.0.0.1:18800') throw unavailable();
 return status.cdpUrl;
}
export function workerEnvironment(env) {
 return Object.fromEntries(['PATH','HOME','TMPDIR'].filter(k => typeof env[k] === 'string').map(k => [k,env[k]]));
}
export function draftState(html) {
 const match = html.match(/<script\b(?=[^>]*\bid=["']__NUXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i);
 if (!match) return false;
 try {
  const values=JSON.parse(match[1]);
  return Array.isArray(values) && values.some(v => v && typeof v === 'object' && !Array.isArray(v) && Number.isInteger(v.$sisPreview) && values[v.$sisPreview] === true);
 } catch { return false; }
}
export function signedPreview(signedUrl,now=Date.now()) {
 try {
  const url=new URL(signedUrl);
  const slug=cleanSlug(url.pathname.slice(1));
  if (url.origin !== 'https://easymailing.com' || url.username || url.password || url.hash) throw unavailable();
  const keys=['_storyblok','_storyblok_tk[space_id]','_storyblok_tk[timestamp]','_storyblok_tk[token]'];
  if ([...url.searchParams].length !== 4 || keys.some(k=>url.searchParams.getAll(k).length!==1)) throw unavailable();
  if (!/^\d+$/.test(url.searchParams.get('_storyblok')) || url.searchParams.get(keys[1])!=='310467') throw unavailable();
  const timestamp=Number(url.searchParams.get(keys[2]));
  const signature=url.searchParams.get(keys[3]);
  const signatureExpiresAt=(timestamp+3600)*1000;
  if (!Number.isSafeInteger(timestamp) || timestamp*1000>now || signatureExpiresAt-now<90000 || !/^[a-f0-9]{40}$/.test(signature)) throw unavailable();
  return {url,slug,signature,signatureExpiresAt};
 } catch { throw unavailable(); }
}
export function snapshotFromResponse({signedUrl,response,now=Date.now()}) {
 try {
  const {url,slug,signature,signatureExpiresAt}=signedPreview(signedUrl,now);
  if (Buffer.byteLength(response)>MAX_HTML_BYTES) throw unavailable();
  let rest=response.replaceAll('\r\n','\n'), headers;
  while (rest.startsWith('HTTP/')) {
   const boundary=rest.indexOf('\n\n'); if (boundary<0) throw unavailable();
   headers=rest.slice(0,boundary); rest=rest.slice(boundary+2);
   if (/^HTTP\/\S+ 200 Connection established(?:\n|$)/i.test(headers) || /^HTTP\/\S+ 1\d\d(?:\s|$)/.test(headers)) continue;
   break;
  }
  if (!headers || !/^HTTP\/\S+ 200(?:\s|$)/.test(headers) || !/^content-type:\s*text\/html\b/im.test(headers)) throw unavailable();
  const cache=headers.match(/^cache-control:\s*(.*)$/im)?.[1] || '';
  if (!/\bno-store\b/i.test(cache) || !/\bprivate\b/i.test(cache) || !draftState(rest)) throw unavailable();
  // Remove the complete preview query in its transport/rendered forms first.
  // Remaining standalone devalue entries are blanked without changing array indices.
  for (const query of [url.search,url.search.replaceAll('&','&amp;'),url.search.replaceAll('&','\\u0026'),encodeURIComponent(url.search)]) rest=rest.split(query).join('');
  rest=rest.split(signature).join('');
  // Named query keys may survive as unused Nuxt devalue entries; remove their names too.
  rest=rest.replace(/_storyblok_tk(?:\[[^\]]*\]|%5[Bb][^%]*%5[Dd])/g,'preview-removed');
  let decoded=rest;
  for(let round=0;round<4;round++) {
   decoded=decoded.replace(/&#x([a-f0-9]+);?/gi,(_,h)=>String.fromCodePoint(Math.min(parseInt(h,16),0x10ffff)))
    .replace(/&#([0-9]+);?/g,(_,d)=>String.fromCodePoint(Math.min(Number(d),0x10ffff)))
    .replace(/\\+u([a-f0-9]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)))
    .replace(/\\+x([a-f0-9]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)))
    .replace(/%([a-f0-9]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
   if(decoded.includes(signature) || /oc-sent-v2|preview_secret|_storyblok_tk/i.test(decoded)) throw unavailable();
  }
  if (!draftState(rest)) throw unavailable();
  return {html:rest,cleanUrl:'https://easymailing.com/'+slug,previewVerified:true,fetchedAt:now,expiresAt:Math.min(now+600000,signatureExpiresAt-60000)};
 } catch { throw unavailable(); }
}
export function documentRequestAllowed(method,url,cleanUrl) { return method==='GET' && url.split('#')[0]===cleanUrl; }

export function captureLocation(output,home) {
 try {
  if(!isAbsolute(output) || !output.endsWith('.png')) throw unavailable();
  const vault=realpathSync(join(home,'marcos-vault'));
  const parent=realpathSync(dirname(output));
  if(parent!==vault && !parent.startsWith(vault+sep)) throw unavailable();
  const dest=resolve(parent,output.slice(output.lastIndexOf(sep)+1));
  try {if(lstatSync(dest).isSymbolicLink()) throw unavailable();} catch(error) {if(error.code!=='ENOENT') throw error;}
  return dest;
 } catch {throw unavailable();}
}

export async function saveCapture(output,buffer,home) {
 const dest=captureLocation(output,home);
 let file;
 try {file=await open(dest,'wx',0o600);await file.writeFile(buffer);return dest;}
 catch {throw unavailable();}
 finally {await file?.close();}
}
