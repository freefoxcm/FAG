/** All public resources and navigation share the Vite deployment prefix. */
export function siteUrl(path=''){
 const base=import.meta.env?.BASE_URL??'/';
 return base+path.replace(/^\//,'');
}
