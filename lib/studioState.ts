import { getToken } from "@/lib/api";

export const STATE_URL = process.env.NEXT_PUBLIC_STUDIO_STATE_URL || "/api/studio/state";

// Keys the app itself uses; never part of the studio's learner state.
const APP_KEYS = new Set(["cafs_token", "cafs_user"]);

export type StudioState = Record<string, string>;

function headers(): HeadersInit {
  const token = getToken();
  return { Accept: "application/json", "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" };
}

/** Learner state from the API. On first use, migrates what the studio kept in localStorage. */
export async function fetchStudioState(): Promise<StudioState> {
  try {
    const response = await fetch(STATE_URL, { headers: headers(), cache: "no-store" });
    if (!response.ok) return {};
    const { state } = (await response.json()) as { state: StudioState };
    if (Object.keys(state).length) return state;

    const local: StudioState = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("cafs_") && !APP_KEYS.has(key)) local[key] = localStorage.getItem(key) ?? "";
    }
    if (Object.keys(local).length) {
      await fetch(STATE_URL, { method: "PUT", headers: headers(), body: JSON.stringify({ set: local }) });
    }
    return local;
  } catch {
    return {};
  }
}

/**
 * Script placed first in the studio document: replaces window.localStorage with a
 * store seeded from the API that writes every change back to it.
 */
export function stateShim(state: StudioState): string {
  const config = JSON.stringify({ seed: state, url: STATE_URL, token: getToken() ?? "" }).replace(/</g, "\u003c");
  return `<script id="cafs-state-api">(function(){
var c=${config},map=c.seed,pending={},timer=null;
function flush(){timer=null;var set=pending;pending={};
fetch(c.url,{method:'PUT',keepalive:true,headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.token},body:JSON.stringify({set:set})}).catch(function(){});}
function queue(k,v){pending[k]=v;if(!timer)timer=setTimeout(flush,300);}
var store={
getItem:function(k){return Object.prototype.hasOwnProperty.call(map,k)?map[k]:null;},
setItem:function(k,v){v=String(v);map[k]=v;queue(k,v);},
removeItem:function(k){delete map[k];queue(k,null);},
clear:function(){Object.keys(map).forEach(function(k){store.removeItem(k);});},
key:function(i){return Object.keys(map)[i]||null;}};
Object.defineProperty(store,'length',{get:function(){return Object.keys(map).length;}});
Object.defineProperty(window,'localStorage',{configurable:true,get:function(){return store;}});
window.addEventListener('pagehide',function(){if(timer){clearTimeout(timer);flush();}});
})();</script>`;
}

/** Inserts the shim as the first thing in <head>. */
export function withStateShim(html: string, state: StudioState): string {
  const shim = stateShim(state);
  const head = html.search(/<head[^>]*>/i);
  if (head === -1) return shim + html;
  const end = html.indexOf(">", head) + 1;
  return html.slice(0, end) + shim + html.slice(end);
}
