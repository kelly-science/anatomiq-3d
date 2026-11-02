/* AnatomIQ 2.2.94 — certificate delivery. No asynchronous work precedes browser download.
 * Retains a direct download URL so the student can tap it if browser blocks an automatic click.
 * An attempted download is not proof a file was actually written by the browser.
 */
let latestURL = null;
let lastURLApi = null;
export function certificateDownloadURL() { return latestURL; }
export function resetCertificateDownload() {
  if (latestURL && lastURLApi?.revokeObjectURL) lastURLApi.revokeObjectURL(latestURL);
  latestURL = null;
  lastURLApi = null;
}
export function deliverCertificatePNG(canvas, filename='AnatomIQ-Lesson-Certificate.png', options={}) {
  const doc = options.document || document;
  const nav = options.navigator || navigator;
  const win = options.window || window;
  const urlApi = options.URL || URL;
  const decodeBase64 = options.atob || atob;
  const png = canvas.toDataURL('image/png'); // Synchronous: retains user activation.
  const prefix = 'data:image/png;base64,';
  if (typeof png !== 'string' || !png.startsWith(prefix)) throw Error('The certificate PNG could not be generated.');
  const raw = decodeBase64(png.slice(prefix.length));
  const bytes = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) bytes[i] = raw.charCodeAt(i);
  const blob = new Blob([bytes],{type:'image/png'});
  const newURL = urlApi.createObjectURL(blob);
  resetCertificateDownload();
  latestURL = newURL;
  lastURLApi = urlApi;

  // Installed iOS PWAs have documented limitations with the HTML download attribute.
  // Prefer the native file share sheet there, *without* awaiting blob conversion first.
  const mobileIOS = /\b(iPad|iPhone|iPod)\b/i.test(nav.userAgent||'');
  const standalone = nav.standalone === true || !!win.matchMedia?.('(display-mode: standalone)')?.matches;
  if(mobileIOS && standalone && typeof File !== 'undefined' && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    const file = new File([blob], filename, {type:'image/png'});
    if(nav.canShare({files:[file]})) {
      try {
        const sharing = nav.share({files:[file],title:'AnatomIQ Lesson Certificate'});
        return Promise.resolve(sharing).then(()=>true).catch(error=>{
          if(error?.name==='AbortError')return false;
          throw error;
        });
      } catch(error) {
        if(error?.name==='AbortError')return false;
        throw error;
      }
    }
  }

  // A click within the original student button handler keeps the browser gesture alive.
  const anchor=doc.createElement('a');
  anchor.href=newURL;
  anchor.download=filename;
  anchor.rel='noopener';
  anchor.setAttribute('aria-hidden','true');
  anchor.style.position='absolute';
  anchor.style.left='-10000px';
  doc.body.appendChild(anchor);
  try { anchor.click(); }
  finally {anchor.remove();}
  return true;
}
