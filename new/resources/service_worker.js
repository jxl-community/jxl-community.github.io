// Copyright (c) the JPEG XL Project Authors. All rights reserved.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * ServiceWorker script.
 *
 * Multi-threading in WASM is currently implemented by the means of
 * SharedArrayBuffer. Due to infamous vulnerabilities this feature is disabled
 * unless site is running in "cross-origin isolated" mode.
 * If there is not enough control over the server (e.g. when pages are hosted as
 * "github pages") ServiceWorker is used to upgrade responses with corresponding
 * headers.
 *
 * This script could be executed in 2 environments: HTML page or ServiceWorker.
 * The environment is detected by the type of "window" reference.
 *
 * When this script is executed from HTML page then ServiceWorker is registered.
 * Page reload might be necessary in some situations. By default it is done via
 * `window.location.reload()`. However this can be altered by setting a
 * configuration object `window.serviceWorkerConfig`. It's `doReload` property
 * should be a replacement callable.
 *
 * When this script is executed from ServiceWorker then standard lifecycle
 * event dispatchers are setup along with `fetch` interceptor.
 */

(() => {
  // Embedded (baked-in) responses for faster turn-around.
  const EMBEDDED = {
    'client_worker.js': 'let decoder=null,jobs=[];const processJobs=()=>{if(decoder)for(;;){let o=null;for(let e=0;e<jobs.length;++e)if(jobs[e].inputComplete){o=jobs[e],jobs[e]=jobs[jobs.length-1],jobs.pop();break}if(!o)return;console.log("CW job: "+o.uid);var r=o.input;let l=0;for(let e=0;e<r.length;e++)l+=r[e].length;var t=decoder._malloc(l);let d=0;for(let e=0;e<r.length;++e)decoder.HEAP8.set(r[e],t+d),d+=r[e].length;var e=Date.now(),s=decoder._jxlDecompress(t,l),n=Date.now(),n="Decoded "+o.url+" in "+(n-e)+"ms",e=(decoder._free(t),decoder.HEAP32[s>>2]),c=decoder.HEAP32[s+4>>2];const i=new Uint8Array(e),u=new Uint8Array(decoder.HEAP8.buffer);i.set(u.slice(c,c+e)),decoder._jxlCleanup(s);c={uid:o.uid,data:i,msg:n};postMessage(c,[i.buffer])}},onLoadJxlModule=(onmessage=function(e){var l=e.data;if(console.log("CW received: "+l.op),"decodeJxl"===l.op){let o=null;for(let e=0;e<jobs.length;++e)if(jobs[e].uid===l.uid){o=jobs[e];break}o||(o={uid:l.uid,input:[],inputComplete:!1,url:l.url},jobs.push(o)),l.data?o.input.push(l.data):o.inputComplete=!0,processJobs()}},e=>{decoder=e,processJobs()}),config=(importScripts("jxl_decoder.js"),{mainScriptUrlOrBlob:"https://jxl-demo.netlify.app/jxl_decoder.js",INITIAL_MEMORY:16777216});JxlDecoderModule(config).then(onLoadJxlModule);',
    'jxl_decoder.js': 'var JxlDecoderModule=(()=>{var We="undefined"!=typeof document&&document.currentScript?document.currentScript.src:void 0;return"undefined"!=typeof __filename&&(We=We||__filename),function(e){function D(){return x.buffer!=A&&S(x.buffer),N}function b(){return x.buffer!=A&&S(x.buffer),V}function t(){return x.buffer!=A&&S(x.buffer),X}function g(){return x.buffer!=A&&S(x.buffer),J}function B(){return x.buffer!=A&&S(x.buffer),z}e=e||{},(o=o||(void 0!==e?e:{})).ready=new Promise(function(e,n){r=e,i=n});var o,r,i,n,s,a,C=Object.assign({},o),u=(e,n)=>{throw n},c="object"==typeof window,f="function"==typeof importScripts,l="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node,w=o.ENVIRONMENT_IS_PTHREAD||!1,p="";function O(e){return o.locateFile?o.locateFile(e,p):p+e}if(l){var d,m,p=f?require("path").dirname(p)+"/":__dirname+"/";"function"==typeof require&&(d=require("fs"),m=require("path")),n=(e,n)=>(e=m.normalize(e),d.readFileSync(e,n?void 0:"utf8")),a=e=>e=(e=n(e,!0)).buffer?e:new Uint8Array(e),s=(e,t,r)=>{e=m.normalize(e),d.readFile(e,function(e,n){e?r(e):t(n.buffer)})},1<process.argv.length&&process.argv[1].replace(/\\\\/g,"/"),process.argv.slice(2),process.on("uncaughtException",function(e){if(!(e instanceof E))throw e}),process.on("unhandledRejection",function(e){throw e}),u=(e,n)=>{if(y)throw process.exitCode=e,n;n instanceof E||v("exiting due to exception: "+n),process.exit(e)},o.inspect=function(){return"[Emscripten Module object]"};let e;try{e=require("worker_threads")}catch(e){throw console.error(\'The "worker_threads" module is not supported in this node.js build - perhaps a newer version is needed?\'),e}global.Worker=e.Worker}else(c||f)&&(f?p=self.location.href:"undefined"!=typeof document&&document.currentScript&&(p=document.currentScript.src),p=0!==(p=We?We:p).indexOf("blob:")?p.substr(0,p.replace(/[?#].*/,"").lastIndexOf("/")+1):"",l||(n=e=>{var n=new XMLHttpRequest;return n.open("GET",e,!1),n.send(null),n.responseText},f&&(a=e=>{var n=new XMLHttpRequest;return n.open("GET",e,!1),n.responseType="arraybuffer",n.send(null),new Uint8Array(n.response)}),s=(e,n,t)=>{var r=new XMLHttpRequest;r.open("GET",e,!0),r.responseType="arraybuffer",r.onload=()=>{200==r.status||0==r.status&&r.response?n(r.response):t()},r.onerror=t,r.send(null)}));l&&"undefined"==typeof performance&&(global.performance=require("perf_hooks").performance);var h,_=console.log.bind(console),H=console.warn.bind(console),F=(l&&(_=e=>d.writeSync(1,e+"\\n"),H=e=>d.writeSync(2,e+"\\n")),o.print||_),v=o.printErr||H,y=(Object.assign(o,C),o.quit&&(u=o.quit),o.wasmBinary&&(h=o.wasmBinary),o.noExitRuntime||!0);"object"!=typeof WebAssembly&&k("no native wasm support detected");var x,L,A,N,V,X,J,z,Q=!1,G="undefined"!=typeof TextDecoder?new TextDecoder("utf8"):void 0;function S(e){A=e,o.HEAP8=N=new Int8Array(e),o.HEAP16=new Int16Array(e),o.HEAP32=X=new Int32Array(e),o.HEAPU8=V=new Uint8Array(e),o.HEAPU16=new Uint16Array(e),o.HEAPU32=J=new Uint32Array(e),o.HEAPF32=new Float32Array(e),o.HEAPF64=z=new Float64Array(e)}w&&(A=o.buffer);_=o.INITIAL_MEMORY||16777216;if(w)x=o.wasmMemory,A=o.buffer;else if(o.wasmMemory)x=o.wasmMemory;else if(!((x=new WebAssembly.Memory({initial:_/65536,maximum:32768,shared:!0})).buffer instanceof SharedArrayBuffer))throw v("requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer, indicating that while the browser has SharedArrayBuffer it does not have WebAssembly threads support - you may need to set a flag"),l&&v("(on node you may need: --experimental-wasm-threads --experimental-wasm-bulk-memory and also use a recent version)"),Error("bad memory");_=(A=x?x.buffer:A).byteLength,S(A);var Y,Z=[],$=[],K=[];var R,T=0,ee=null,M=null;function k(e){throw w?postMessage({cmd:"onAbort",arg:e}):o.onAbort&&o.onAbort(e),v(e="Aborted("+e+")"),Q=!0,e=new WebAssembly.RuntimeError(e+". Build with -sASSERTIONS for more info."),i(e),e}function ne(){return R.startsWith("data:application/octet-stream;base64,")}function te(){var e=R;try{if(e==R&&h)return new Uint8Array(h);if(a)return a(e);throw"both async and sync fetching of the wasm failed"}catch(e){k(e)}}R="jxl_decoder.wasm",ne()||(R=O(R));var re={};function E(e){this.name="ExitStatus",this.message="Program terminated with exit("+e+")",this.status=e}function ae(e){(e=j.S[e])||k(),j.$(e)}function oe(e){var n=j.ma();if(!n)return 6;j.W.push(n),(j.S[e.R]=n).R=e.R;var t={cmd:"run",start_routine:e.qa,arg:e.ka,pthread_ptr:e.R};return n.V=()=>{t.time=performance.now(),n.postMessage(t,e.sa)},n.loaded&&(n.V(),delete n.V),0}function ie(e){if(w)return P(1,1,e);y||(j.ra(),o.onExit&&o.onExit(e),Q=!0),u(e,new E(e))}function se(e,n){if(!n&&w)throw ue(e),"unwind";ie(e)}var j={T:[],W:[],da:[],S:{},X:function(){w?j.oa():j.na()},na:function(){for(var e=4;e--;)j.Y()},oa:function(){j.receiveObjectTransfer=j.pa,j.threadInitTLS=j.ba,j.setExitStatus=j.aa,y=!1},aa:function(){},ra:function(){for(var e of Object.values(j.S))j.$(e);for(e of j.T)e.terminate();j.T=[]},$:function(e){var n=e.R;delete j.S[n],j.T.push(e),j.W.splice(j.W.indexOf(e),1),e.R=0,Re(n)},pa:function(){},ba:function(){j.da.forEach(e=>e())},Z:function(r,a){r.onmessage=e=>{var n,t=(e=e.data).cmd;r.R&&(j.la=r.R),e.targetThread&&e.targetThread!=U()?(n=j.S[e.ua])?n.postMessage(e,e.transferList):v(\'Internal error! Worker sent a message "\'+t+\'" to target pthread \'+e.targetThread+", but that thread no longer exists!"):"processProxyingQueue"===t?de(e.queue):"spawnThread"===t?oe(e):"cleanupThread"===t?ae(e.thread):"killThread"===t?(e=e.thread,t=j.S[e],delete j.S[e],t.terminate(),Re(e),j.W.splice(j.W.indexOf(t),1),t.R=0):"cancelThread"===t?j.S[e.thread].postMessage({cmd:"cancel"}):"loaded"===t?(r.loaded=!0,a&&a(r),r.V&&(r.V(),delete r.V)):"print"===t?F("Thread "+e.threadId+": "+e.text):"printErr"===t?v("Thread "+e.threadId+": "+e.text):"alert"===t?alert("Thread "+e.threadId+": "+e.text):"setimmediate"===e.target?r.postMessage(e):"onAbort"===t?o.onAbort&&o.onAbort(e.arg):t&&v("worker sent an unknown command "+t),j.la=void 0},r.onerror=e=>{throw v("worker sent an error! "+e.filename+":"+e.lineno+": "+e.message),e},l&&(r.on("message",function(e){r.onmessage({data:e})}),r.on("error",function(e){r.onerror(e)}),r.on("detachedExit",function(){})),r.postMessage({cmd:"load",urlOrBlob:o.mainScriptUrlOrBlob||We,wasmMemory:x,wasmModule:L})},Y:function(){var e=O("jxl_decoder.worker.js");j.T.push(new Worker(e))},ma:function(){return 0==j.T.length&&(j.Y(),j.Z(j.T[0])),j.T.pop()}};function I(e){for(;0<e.length;)e.shift()(o)}function ue(e){if(w)return P(2,0,e);try{se(e)}catch(e){e instanceof E||"unwind"==e||u(1,e)}}o.PThread=j,o.establishStackSpace=function(){var e=U(),n=t()[e+44>>2],e=t()[e+48>>2];Me(n,n-e),Ee(n)};var W=[];function ce(e){this.U=e-24,this.ja=function(e){g()[this.U+4>>2]=e},this.ga=function(e){g()[this.U+8>>2]=e},this.ha=function(){t()[this.U>>2]=0},this.fa=function(){D()[this.U+12>>0]=0},this.ia=function(){D()[this.U+13>>0]=0},this.X=function(e,n){this.ea(),this.ja(e),this.ga(n),this.ha(),this.fa(),this.ia()},this.ea=function(){g()[this.U+16>>2]=0}}o.invokeEntryPoint=function(e,n){var t=W[e];t||(e>=W.length&&(W.length=e+1),W[e]=t=Y.get(e)),e=t(n),y?j.aa(e):Te(e)};var fe;function le(e,n,t,r){return w?P(3,1,e,n,t,r):pe(e,n,t,r)}function pe(e,n,t,r){if("undefined"==typeof SharedArrayBuffer)return v("Current environment does not support SharedArrayBuffer, pthreads are not available!"),6;var a=[];return w&&0===a.length?le(e,n,t,r):(e={qa:t,R:e,ka:r,sa:a},w?(e.ta="spawnThread",postMessage(e,a),0):oe(e))}function de(e){Atomics.store(t(),e>>2,1),U()&&Se(e),Atomics.compareExchange(t(),e>>2,1,0)}function P(a,o){var e,n,i=arguments.length-2,s=arguments;return e=()=>{for(var e=je(8*i),n=e>>3,t=0;t<i;t++){var r=s[2+t];B()[n+t]=r}return Ae(a,i,e,o)},n=ke(),e=e(),Ee(n),e}o.executeNotifiedProxyingQueue=de;var H=l?()=>{var e=process.hrtime();return 1e3*e[0]+e[1]/1e6}:w?()=>performance.now()-o.__performance_now_clock_drift:()=>performance.now(),me=[];function he(e){return w?P(4,1,e):52}function _e(e,n,t,r,a){return w?P(5,1,e,n,t,r,a):70}var ye=[null,[],[]];function be(e,n,t,r){if(w)return P(6,1,e,n,t,r);for(var a=0,o=0;o<t;o++){var i=g()[n>>2],s=g()[n+4>>2];n+=8;for(var u=0;u<s;u++){var c=b()[i+u],f=ye[e];if(0===c||10===c){for(var c=1===e?F:v,l=f,p=0,d=p+NaN,m=p;l[m]&&!(d<=m);)++m;if(16<m-p&&l.buffer&&G)l=G.decode(l.buffer instanceof SharedArrayBuffer?l.slice(p,m):l.subarray(p,m));else{for(d="";p<m;){var h,_,y=l[p++];128&y?(h=63&l[p++],192==(224&y)?d+=String.fromCharCode((31&y)<<6|h):(_=63&l[p++],(y=224==(240&y)?(15&y)<<12|h<<6|_:(7&y)<<18|h<<12|_<<6|63&l[p++])<65536?d+=String.fromCharCode(y):(y-=65536,d+=String.fromCharCode(55296|y>>10,56320|1023&y)))):d+=String.fromCharCode(y)}l=d}c(l),f.length=0}else f.push(c)}a+=s}return g()[r>>2]=a,0}j.X();var q,ge=[null,ie,ue,le,he,_e,be],we={h:function(e){return ve(e+24)+24},g:function(e,n,t){throw new ce(e).X(n,t),e},j:function(e){xe(e,!f,1,!c),j.ba()},e:function(e){w?postMessage({cmd:"cleanupThread",thread:e}):ae(e)},r:pe,s:function(){return 2097152},t:function(e,n,t,r){if(e==n)setTimeout(()=>de(r));else if(w)postMessage({targetThread:e,cmd:"processProxyingQueue",queue:r});else{if(!(e=j.S[e]))return;e.postMessage({cmd:"processProxyingQueue",queue:r})}return 1},l:function(){return-1},b:function(){k("")},f:function(){var e;l||f||((fe=fe||{})[e="Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread"]||(fe[e]=1,v(e=l?"warning: "+e:e)))},c:H,i:function(e,n,t){b().copyWithin(e,n,n+t)},k:function(e,n,t){me.length=n,t>>=3;for(var r=0;r<n;r++)me[r]=B()[t+r];return(e<0?re[-e-1]:ge[e]).apply(null,me)},p:function(e){var n=b().length;if((e>>>=0)<=n||2147483648<e)return!1;for(var t=1;t<=4;t*=2){var r=n*(1+.2/t),r=Math.min(r,e+100663296),a=Math;r=Math.max(e,r),a=a.min.call(a,2147483648,r+(65536-r%65536)%65536);e:{try{x.grow(a-A.byteLength+65535>>>16),S(x.buffer);var o=1;break e}catch(e){}o=void 0}if(o)return!0}return!1},m:function(){throw"unwind"},n:se,q:he,o:_e,d:be,a:x||o.wasmMemory},ve=(!function(){function n(e,n){var t;o.asm=e.exports,j.da.push(o.asm.E),Y=o.asm.B,$.unshift(o.asm.u),L=n,w||(t=j.T.length,j.T.forEach(function(e){j.Z(e,function(){var e;!--t&&(T--,o.monitorRunDependencies&&o.monitorRunDependencies(T),0==T&&(null!==ee&&(clearInterval(ee),ee=null),M))&&(e=M,M=null,e())})}))}function t(e){n(e.instance,e.module)}function r(e){return function(){if(!h&&(c||f)){if("function"==typeof fetch&&!R.startsWith("file://"))return fetch(R,{credentials:"same-origin"}).then(function(e){if(e.ok)return e.arrayBuffer();throw"failed to load wasm binary file at \'"+R+"\'"}).catch(te);if(s)return new Promise(function(n,e){s(R,function(e){n(new Uint8Array(e))},e)})}return Promise.resolve().then(te)}().then(function(e){return WebAssembly.instantiate(e,a)}).then(function(e){return e}).then(e,function(e){v("failed to asynchronously prepare wasm: "+e),k(e)})}var a={a:we};if(w||(T++,o.monitorRunDependencies&&o.monitorRunDependencies(T)),o.instantiateWasm)try{return o.instantiateWasm(a,n)}catch(e){v("Module.instantiateWasm callback failed with error: "+e),i(e)}(h||"function"!=typeof WebAssembly.instantiateStreaming||ne()||R.startsWith("file://")||l||"function"!=typeof fetch?r(t):fetch(R,{credentials:"same-origin"}).then(function(e){return WebAssembly.instantiateStreaming(e,a).then(t,function(e){return v("wasm streaming compile failed: "+e),v("falling back to ArrayBuffer instantiation"),r(t)})})).catch(i)}(),o.___wasm_call_ctors=function(){return(o.___wasm_call_ctors=o.asm.u).apply(null,arguments)},o._jxlCreateInstance=function(){return(o._jxlCreateInstance=o.asm.v).apply(null,arguments)},o._jxlDestroyInstance=function(){return(o._jxlDestroyInstance=o.asm.w).apply(null,arguments)},o._free=function(){return(o._free=o.asm.x).apply(null,arguments)},o._jxlProcessInput=function(){return(o._jxlProcessInput=o.asm.y).apply(null,arguments)},o._malloc=function(){return(ve=o._malloc=o.asm.z).apply(null,arguments)}),U=(o._jxlFlush=function(){return(o._jxlFlush=o.asm.A).apply(null,arguments)},o._jxlDecompress=function(){return(o._jxlDecompress=o.asm.C).apply(null,arguments)},o._jxlCleanup=function(){return(o._jxlCleanup=o.asm.D).apply(null,arguments)},o.__emscripten_tls_init=function(){return(o.__emscripten_tls_init=o.asm.E).apply(null,arguments)},o._pthread_self=function(){return(U=o._pthread_self=o.asm.F).apply(null,arguments)}),xe=o.__emscripten_thread_init=function(){return(xe=o.__emscripten_thread_init=o.asm.G).apply(null,arguments)},Ae=(o.__emscripten_thread_crashed=function(){return(o.__emscripten_thread_crashed=o.asm.H).apply(null,arguments)},o._emscripten_run_in_main_runtime_thread_js=function(){return(Ae=o._emscripten_run_in_main_runtime_thread_js=o.asm.I).apply(null,arguments)}),Se=o.__emscripten_proxy_execute_task_queue=function(){return(Se=o.__emscripten_proxy_execute_task_queue=o.asm.J).apply(null,arguments)},Re=o.__emscripten_thread_free_data=function(){return(Re=o.__emscripten_thread_free_data=o.asm.K).apply(null,arguments)},Te=o.__emscripten_thread_exit=function(){return(Te=o.__emscripten_thread_exit=o.asm.L).apply(null,arguments)},Me=o._emscripten_stack_set_limits=function(){return(Me=o._emscripten_stack_set_limits=o.asm.M).apply(null,arguments)},ke=o.stackSave=function(){return(ke=o.stackSave=o.asm.N).apply(null,arguments)},Ee=o.stackRestore=function(){return(Ee=o.stackRestore=o.asm.O).apply(null,arguments)},je=o.stackAlloc=function(){return(je=o.stackAlloc=o.asm.P).apply(null,arguments)};function Ie(){function e(){if(!q&&(q=!0,o.calledRun=!0,!Q)&&(w||I($),r(o),o.onRuntimeInitialized&&o.onRuntimeInitialized(),!w)){if(o.postRun)for("function"==typeof o.postRun&&(o.postRun=[o.postRun]);o.postRun.length;){var e=o.postRun.shift();K.unshift(e)}I(K)}}if(!(0<T))if(w)r(o),w||I($),postMessage({cmd:"loaded"});else{if(o.preRun)for("function"==typeof o.preRun&&(o.preRun=[o.preRun]);o.preRun.length;)n=void 0,n=o.preRun.shift(),Z.unshift(n);I(Z),0<T||(o.setStatus?(o.setStatus("Running..."),setTimeout(function(){setTimeout(function(){o.setStatus("")},1),e()},1)):e())}var n}if(o.___cxa_is_pointer_type=function(){return(o.___cxa_is_pointer_type=o.asm.Q).apply(null,arguments)},o.keepRuntimeAlive=function(){return y},o.wasmMemory=x,o.ExitStatus=E,o.PThread=j,M=function e(){q||Ie(),q||(M=e)},o.preInit)for("function"==typeof o.preInit&&(o.preInit=[o.preInit]);0<o.preInit.length;)o.preInit.pop()();return Ie(),e.ready}})();"object"==typeof exports&&"object"==typeof module?module.exports=JxlDecoderModule:"function"==typeof define&&define.amd?define([],function(){return JxlDecoderModule}):"object"==typeof exports&&(exports.JxlDecoderModule=JxlDecoderModule);',
    'jxl_decoder.worker.js': '"use strict";var Module={},ENVIRONMENT_IS_NODE="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node,nodeWorkerThreads,parentPort,fs,initializedJS=(ENVIRONMENT_IS_NODE&&(nodeWorkerThreads=require("worker_threads"),parentPort=nodeWorkerThreads.parentPort,parentPort.on("message",e=>onmessage({data:e})),fs=require("fs"),Object.assign(global,{self:global,require:require,Module:Module,location:{href:__filename},Worker:nodeWorkerThreads.Worker,importScripts:function(e){(0,eval)(fs.readFileSync(e,"utf8"))},postMessage:function(e){parentPort.postMessage(e)},performance:global.performance||{now:function(){return Date.now()}}})),!1),pendingNotifiedProxyingQueues=[];function threadPrintErr(){var e=Array.prototype.slice.call(arguments).join(" ");ENVIRONMENT_IS_NODE?fs.writeSync(2,e+"\\n"):console.error(e)}function threadAlert(){var e=Array.prototype.slice.call(arguments).join(" ");postMessage({cmd:"alert",text:e,threadId:Module._pthread_self()})}var err=threadPrintErr;self.alert=threadAlert,Module.instantiateWasm=(e,r)=>{e=new WebAssembly.Instance(Module.wasmModule,e);return r(e),Module.wasmModule=null,e.exports},self.onunhandledrejection=e=>{throw e.reason??e},self.onmessage=e=>{try{var r;if("load"===e.data.cmd)Module.wasmModule=e.data.wasmModule,Module.wasmMemory=e.data.wasmMemory,Module.buffer=Module.wasmMemory.buffer,Module.ENVIRONMENT_IS_PTHREAD=!0,"string"==typeof e.data.urlOrBlob?importScripts(e.data.urlOrBlob):(r=URL.createObjectURL(e.data.urlOrBlob),importScripts(r),URL.revokeObjectURL(r)),JxlDecoderModule(Module).then(function(e){Module=e});else if("run"===e.data.cmd){Module.__performance_now_clock_drift=performance.now()-e.data.time,Module.__emscripten_thread_init(e.data.pthread_ptr,0,0,1),Module.establishStackSpace(),Module.PThread.receiveObjectTransfer(e.data),Module.PThread.threadInitTLS(),initializedJS||(pendingNotifiedProxyingQueues.forEach(e=>{Module.executeNotifiedProxyingQueue(e)}),pendingNotifiedProxyingQueues=[],initializedJS=!0);try{Module.invokeEntryPoint(e.data.start_routine,e.data.arg)}catch(e){if("unwind"!=e){if(!(e instanceof Module.ExitStatus))throw e;Module.keepRuntimeAlive()||Module.__emscripten_thread_exit(e.status)}}}else"cancel"===e.data.cmd?Module._pthread_self()&&Module.__emscripten_thread_exit(-1):"setimmediate"!==e.data.target&&("processProxyingQueue"===e.data.cmd?initializedJS?Module.executeNotifiedProxyingQueue(e.data.queue):pendingNotifiedProxyingQueues.push(e.data.queue):e.data.cmd&&(err("worker.js received unknown command "+e.data.cmd),err(e.data)))}catch(e){throw Module.__emscripten_thread_crashed&&Module.__emscripten_thread_crashed(),e}};',
  };

  // Enable SharedArrayBuffer.
  const setCopHeaders = (headers) => {
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  };

  // Inflight object: {clientId, uid, timestamp, controller}
  const inflight = [];

  // Generate (very likely) unique string.
  const makeUid = () => {
    return Math.random().toString(36).substring(2) +
        Math.random().toString(36).substring(2);
  };

  // Make list (non-recursively) of transferable entities.
  const gatherTransferrables = (...args) => {
    const result = [];
    for (let i = 0; i < args.length; ++i) {
      if (args[i] && args[i].buffer) {
        result.push(args[i].buffer);
      }
    }
    return result;
  };

  // Serve items that are embedded in this service worker.
  const maybeProcessEmbeddedResources = (event) => {
    const url = event.request.url;
    // Shortcut for baked-in scripts.
    for (const [key, value] of Object.entries(EMBEDDED)) {
      if (url.endsWith(key)) {
        const headers = new Headers();
        headers.set('Content-Type', 'application/javascript');
        setCopHeaders(headers);

        event.respondWith(new Response(value, {
          status: 200,
          statusText: 'OK',
          headers: headers,
        }));
        return true;
      }
    }
    return false;
  };

  // Decode JXL image response and serve it as a PNG image.
  const wrapImageResponse = async (clientId, originalResponse) => {
    // TODO: cache?
    const client = await clients.get(clientId);
    // Client is gone? Not our problem then.
    if (!client) {
      return originalResponse;
    }

    const inputStream = await originalResponse.body;
    // Can't use "BYOB" for regular responses.
    const reader = inputStream.getReader();

    const inflightEntry = {
      clientId: clientId,
      uid: makeUid(),
      timestamp: Date.now(),
      inputStreamReader: reader,
      outputStreamController: null
    };
    inflight.push(inflightEntry);

    const outputStream = new ReadableStream({
      start: (controller) => {
        inflightEntry.outputStreamController = controller;
      }
    });

    const onRead = (chunk) => {
      const msg = {
        op: 'decodeJxl',
        uid: inflightEntry.uid,
        url: originalResponse.url,
        data: chunk.value || null
      };
      client.postMessage(msg, gatherTransferrables(msg.data));
      if (!chunk.done) {
        reader.read().then(onRead);
      }
    };
    reader.read(new SharedArrayBuffer(65536)).then(onRead);

    let modifiedResponseHeaders = new Headers(originalResponse.headers);
    modifiedResponseHeaders.delete('Content-Length');
    modifiedResponseHeaders.set('Content-Type', 'image/png');
    modifiedResponseHeaders.set('Server', 'ServiceWorker');
    return new Response(outputStream, {headers: modifiedResponseHeaders});
  };

  // Check if response needs decoding; if so - do it.
  const wrapImageRequest = async (clientId, request) => {
    let modifiedRequestHeaders = new Headers(request.headers);
    modifiedRequestHeaders.append('Accept', 'image/jxl');
    let modifiedRequest =
        new Request(request, {headers: modifiedRequestHeaders});
    let originalResponse = await fetch(modifiedRequest);
    let contentType = originalResponse.headers.get('Content-Type');

    if (contentType === 'image/jxl') {
      return wrapImageResponse(clientId, originalResponse);
    }

    return originalResponse;
  };

  // Process fetch request; either bypass, or serve embedded resource, or upgrade.
  const onFetch = async (event) => {
    const clientId = event.clientId;
    const request = event.request;

    // Pass direct cached resource requests.
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
      return;
    }

    // Serve backed resources.
    if (maybeProcessEmbeddedResources(event)) {
      return;
    }

    // Notify server we are JXL-capable.
    if (request.destination === 'image') {
      let accept = request.headers.get('Accept');
      // Only if browser does not support JXL.
      if (accept.indexOf('image/jxl') === -1) {
        event.respondWith(wrapImageRequest(clientId, request));
      }
      return;
    }
  };

  // Serve decoded bytes.
  const onMessage = (event) => {
    const data = event.data;
    const uid = data.uid;
    let inflightEntry = null;
    for (let i = 0; i < inflight.length; ++i) {
      if (inflight[i].uid === uid) {
        inflightEntry = inflight[i];
        break;
      }
    }
    if (!inflightEntry) {
      console.log('Ooops, not found: ' + uid);
      return;
    }
    inflightEntry.outputStreamController.enqueue(data.data);
    inflightEntry.outputStreamController.close();
  };

  // This method is "main" for service worker.
  const serviceWorkerMain = () => {
    // https://v8.dev/blog/wasm-code-caching
    // > Every web site must perform at least one full compilation of a
    // > WebAssembly module — use workers to hide that from your users.
    // TODO(eustas): not 100% reliable, investigate why
    self['JxlDecoderLeak'] = WebAssembly.compileStreaming(fetch('jxl_decoder.wasm'));

    // ServiceWorker lifecycle.
    self.addEventListener('install', () => {
      return self.skipWaiting();
    });
    self.addEventListener(
        'activate', (event) => event.waitUntil(self.clients.claim()));
    self.addEventListener('message', onMessage);
    // Intercept some requests.
    self.addEventListener('fetch', onFetch);
  };

  // Service workers does not support multi-threading; that is why decoding is
  // relayed back to "client" (document / window).
  const prepareClient = () => {
    const clientWorker = new Worker('client_worker.js');
    clientWorker.onmessage = (event) => {
      const data = event.data;
      if (typeof addMessage !== 'undefined') {
        if (data.msg) {
          addMessage(data.msg, 'blue');
        }
      }
      navigator.serviceWorker.controller.postMessage(
          data, gatherTransferrables(data.data));
    };

    // Forward ServiceWorker requests to "Client" worker.
    navigator.serviceWorker.addEventListener('message', (event) => {
      clientWorker.postMessage(
          event.data, gatherTransferrables(event.data.data));
    });
  };

  // Executed in HTML page environment.
  const maybeRegisterServiceWorker = () => {
    if (!window.isSecureContext) {
      config.log('Secure context is required for this ServiceWorker.');
      return;
    }

    const config = {
      log: console.log,
      error: console.error,
      ...window.serviceWorkerConfig  // add overrides
    }

    const onServiceWorkerRegistrationSuccess = (registration) => {
      config.log('Service Worker registered', registration.scope);
    };

    const onServiceWorkerRegistrationFailure = (err) => {
      config.error('Service Worker failed to register:', err);
    };

    navigator.serviceWorker.register(window.document.currentScript.src)
        .then(
            onServiceWorkerRegistrationSuccess,
            onServiceWorkerRegistrationFailure);
  };

  const pageMain = () => {
    maybeRegisterServiceWorker();
    prepareClient();
  };

  // Detect environment and run corresponding "main" method.
  if (typeof window === 'undefined') {
    serviceWorkerMain();
  } else {
    pageMain();
  }
})();