/** AnatomIQ 2.2.17: classify authentic Écorché bones, never reclassify anatomy systems. */
export function skeletalDivision(s) {
  if (!s || s.system !== 'skeletal' || s.tissue === 'cartilage') return null;
  const name = String(s.name || s.sourceName || '').toLowerCase().replace(/[\u2013\u2014_-]/g, ' ').replace(/\s+/g, ' ').trim();
  // `skull` is AnatomIQ's source-backed skull classification, not a substring guess.
  if (s.skull || s.tissue === 'tooth') return 'axial';
  // Axial skeleton: skull + auditory ossicles, hyoid, vertebral column and thoracic cage.
  if (/(?:^|\b)(?:malleus|incus|stapes|hyoid|sternum|manubrium|xiphoid|rib|ribs|costae|vertebra|vertebrae|vertebral|atlas|axis|sacrum|sacral bone|coccyx|coccygeal bone)(?:\b|$)/i.test(name)) return 'axial';
  if (/\b(?:cervical|thoracic|lumbar)\s*(?:spine|vertebr(?:a|ae))\b/.test(name)) return 'axial';
  if (/\b(?:c[1-7]|t(?:[1-9]|1[0-2])|l[1-5])\b/i.test(name)) return 'axial';
  // All other *skeletal-system* parts are appendicular; Connective is never included.
  return 'appendicular';
}

/** Stable numeric semantic version followed by optional legacy alphabetic hotfix. */
export function parseStudioVersion(value) {
  const match=/^(\d+)\.(\d+)\.(\d+)([a-z]?)$/i.exec(String(value||'').trim());
  if (!match) return null;
  return {numbers:match.slice(1,4).map(Number),revision:match[4].toLowerCase()};
}
export function compareStudioVersions(a,b) {
  const A=parseStudioVersion(a),B=parseStudioVersion(b);
  if(!A||!B)throw new Error('Unsupported app version');
  for(let i=0;i<3;i++)if(A.numbers[i]!==B.numbers[i])return Math.sign(A.numbers[i]-B.numbers[i]);
  // A plain numbered release precedes lettered hotfixes for that same number.
  return Math.sign((A.revision?A.revision.charCodeAt(0)-96:0)-(B.revision?B.revision.charCodeAt(0)-96:0));
}
