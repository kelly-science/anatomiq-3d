/**
 * AnatomIQ Studio — browser-only, opt-in encrypted credential vault.
 * v1: AES-256-GCM; PBKDF2-SHA256 with 310,000 iterations; unique salt/IV.
 * Encrypted token persists in localStorage; a session-only derived key enables
 * reloads within the same tab. The key is NOT persistent across closed tabs.
 *
 * IMPORTANT: A script running on this origin while unlocked could still use
 * the session key/token. This is not a replacement for an HttpOnly/BFF session.
 */
const VAULT_KEY='anatomiq-gh-token-vault-v1';
const SESSION_KEY='anatomiq-gh-vault-unlock-v1';
const V=1, ITERATIONS=310_000;
const te=new TextEncoder(),td=new TextDecoder();
function storage(store){if(!store)throw new Error('Browser storage is unavailable. Use the connection without remembering it.');return store;}
function cryptoAPI(api){if(!api?.subtle||!api?.getRandomValues)throw new Error('Secure browser cryptography is unavailable (HTTPS is required).');return api;}
function toBase64(arr){let str='';for(let i=0;i<arr.length;i+=4096)str+=String.fromCharCode(...arr.slice(i,i+4096));return btoa(str);}
function fromBase64(str){if(typeof str!=='string'||str.length>8192)throw new Error('Invalid encrypted vault data.');return Uint8Array.from(atob(str),c=>c.charCodeAt(0));}
function validScope(scope){
  if(!scope || typeof scope.owner!=='string'||typeof scope.repo!=='string'||typeof scope.branch!=='string')throw new Error('Invalid saved repository information.');
  if(!/^[a-z\d][a-z\d-]{0,38}$/i.test(scope.owner)|| !/^[a-z\d_.-]{1,100}$/i.test(scope.repo)|| !/^[a-z\d._/-]{1,160}$/i.test(scope.branch))throw new Error('Invalid saved repository information.');
  return {owner:scope.owner,repo:scope.repo,branch:scope.branch};
}
function associated(scope){return te.encode(`AnatomIQ Studio GitHub vault v1|${JSON.stringify(validScope(scope))}`);}
function parseVault(store){
  let item;try{item=storage(store).getItem(VAULT_KEY);}catch{throw new Error('Browser storage is blocked.');}
  if(!item)return null;
  let data;try{data=JSON.parse(item);}catch{throw new Error('Stored GitHub credential is damaged. Forget and reconnect.');}
  if(data?.v!==V||typeof data.iv!=='string'||typeof data.salt!=='string'||typeof data.ciphertext!=='string')throw new Error('Stored GitHub credential is incompatible. Forget and reconnect.');
  validScope(data.scope);return data;
}
async function deriveKey(passphrase,salt,cryptoObj){
  const input=await cryptoObj.subtle.importKey('raw',te.encode(passphrase),'PBKDF2',false,['deriveBits']);
  return new Uint8Array(await cryptoObj.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},input,256));
}
async function aesKey(bits,cryptoObj){return cryptoObj.subtle.importKey('raw',bits,{name:'AES-GCM'},false,['encrypt','decrypt']);}
export function hasRememberedConnection({local=globalThis.localStorage}={}){try{return Boolean(parseVault(local));}catch{return true;}}
export function savedConnectionIdentity({local=globalThis.localStorage}={}){return parseVault(local)?.scope||null;}
export function isTabUnlocked({session=globalThis.sessionStorage}={}){try{return !!storage(session).getItem(SESSION_KEY);}catch{return false;}}
export function lockRememberedConnection({session=globalThis.sessionStorage}={}){try{storage(session).removeItem(SESSION_KEY);}catch{}}
export function forgetRememberedConnection({local=globalThis.localStorage,session=globalThis.sessionStorage}={}){
  try{storage(local).removeItem(VAULT_KEY);}catch{}
  lockRememberedConnection({session});
}
/** Call only after a successful GitHub token validation and affirmative user opt-in. */
export async function rememberConnection({token,passphrase,scope,local=globalThis.localStorage,session=globalThis.sessionStorage,cryptoObj=globalThis.crypto}){
  cryptoObj=cryptoAPI(cryptoObj);scope=validScope(scope);
  if(typeof token!=='string'||!token.trim())throw new Error('Connect with a valid token first.');
  if(typeof passphrase!=='string'||passphrase.length<12||passphrase.length>256)throw new Error('Use a vault passphrase of at least 12 characters.');
  const salt=cryptoObj.getRandomValues(new Uint8Array(16));
  const iv=cryptoObj.getRandomValues(new Uint8Array(12));
  const bits=await deriveKey(passphrase,salt,cryptoObj),key=await aesKey(bits,cryptoObj);
  const ciphertext=new Uint8Array(await cryptoObj.subtle.encrypt({name:'AES-GCM',iv,additionalData:associated(scope)},key,te.encode(token.trim())));
  const entry={v:V,scope,salt:toBase64(salt),iv:toBase64(iv),ciphertext:toBase64(ciphertext),createdAt:new Date().toISOString()};
  // Both writes are attempted before replacing old vault: no partial saved token.
  const previousSession=storage(session).getItem(SESSION_KEY);
  storage(session).setItem(SESSION_KEY,toBase64(bits));
  try{storage(local).setItem(VAULT_KEY,JSON.stringify(entry));}
  catch(error){if(previousSession===null)lockRememberedConnection({session});else storage(session).setItem(SESSION_KEY,previousSession);throw new Error('Could not save encrypted credential to browser storage.');}
  return {...scope};
}
/** Passphrase is needed on a new tab; same-tab reload reuses a session-scoped key. */
export async function unlockRememberedConnection({passphrase=null,local=globalThis.localStorage,session=globalThis.sessionStorage,cryptoObj=globalThis.crypto}={}){
  cryptoObj=cryptoAPI(cryptoObj);
  const entry=parseVault(local);
  if(!entry)throw new Error('No remembered GitHub credential found.');
  let bits;
  if(passphrase!==null){
    if(typeof passphrase!=='string'||!passphrase)throw new Error('Enter your vault passphrase.');
    bits=await deriveKey(passphrase,fromBase64(entry.salt),cryptoObj);
  }else{
    const prior=storage(session).getItem(SESSION_KEY);
    if(!prior)throw new Error('Enter the vault passphrase to unlock this browser session.');
    bits=fromBase64(prior);
  }
  try{
    const clear=await cryptoObj.subtle.decrypt({name:'AES-GCM',iv:fromBase64(entry.iv),additionalData:associated(entry.scope)},await aesKey(bits,cryptoObj),fromBase64(entry.ciphertext));
    const token=td.decode(clear);
    if(!token.trim())throw new Error('Empty token');
    if(passphrase!==null)storage(session).setItem(SESSION_KEY,toBase64(bits));
    return {token,scope:entry.scope};
  }catch{
    lockRememberedConnection({session});
    throw new Error('Could not unlock saved GitHub credential. Check the passphrase, or forget and reconnect.');
  }
}
