export const MAX_FILE_SIZE = 3 * 1024 * 1024;
export function safeUrl(value) { if (!value) return ''; const u = new URL(value); if(u.protocol !== 'https:' || u.username || u.password) throw new Error('Use a public HTTPS link without credentials.'); return u.href; }
export function text(value, min=0, max=20000) {const s=String(value??'').trim(); if(s.length<min || s.length>max) throw new Error(`Text must contain ${min}–${max} characters.`); return s;}
export function uuid(value) {if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error('Invalid record identifier.'); return value;}
export function validateFile(name, mime, bytes) {
 if(!bytes.length || bytes.length>MAX_FILE_SIZE) throw new Error('Choose a nonempty file up to 3 MB.');
 const ext=name.split('.').pop()?.toLowerCase();
 const allowed={pdf:'application/pdf',csv:'text/csv',txt:'text/plain',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
 if(!ext || !Object.hasOwn(allowed,ext) || allowed[ext]!==mime) throw new Error('Allowed files: PDF, PPTX, CSV and TXT. Use HTTPS links for code, notebooks and video.');
 if(ext==='pdf' && new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-') throw new Error('Invalid PDF header.');
 if(ext==='pptx' && !(bytes[0]===80 && bytes[1]===75 && bytes[2]===3 && bytes[3]===4)) throw new Error('Invalid PPTX archive header.');
 if(['csv','txt'].includes(ext) && bytes.includes(0)) throw new Error('Expected a text file.');
 return ext;
}
export function bibtex(r) { const clean=s=>String(s??'').replace(/[{}\\]/g,' ').replace(/[\r\n]/g,' '); return `@misc{researchdock_${r.id.replace(/-/g,'')},\n  title = {${clean(r.title)}},\n  author = {${clean(r.authors)}},\n  year = {${clean(r.publication_date).slice(0,4)}},\n  doi = {${clean(r.doi)}},\n  url = {${clean(r.source_url)}}\n}`; }

export function presentationEmbed(value) {try{const u=new URL(safeUrl(value));if(u.hostname!=='docs.google.com')return null;const match=u.pathname.match(/^\/presentation\/d\/([a-zA-Z0-9_-]+)\//);return match?`https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`:null;}catch{return null;}}
