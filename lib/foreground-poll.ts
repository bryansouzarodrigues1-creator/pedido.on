/** Read-only refreshes. Never pass a command, payment or message sender here. */
export function startForegroundPoll(read:(signal:AbortSignal)=>Promise<void>,interval:number,environment={window,document,navigator}){
 let stopped=false,running=false,pending=false,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined,lastStart=-Infinity;
 const visible=()=>environment.document.visibilityState!=="hidden"&&environment.navigator.onLine!==false;
 const clear=()=>{clearTimeout(timer);timer=undefined;};
 async function run(){
  clear();if(stopped||!visible())return;
  if(running){if(controller?.signal.aborted)pending=true;return;}
  running=true;lastStart=Date.now();const current=new AbortController();controller=current;
  const deadline=setTimeout(()=>current.abort(new DOMException("A conexão demorou.","TimeoutError")),20000);
  try{await read(current.signal);}catch{/* Each reader presents its own connection state. */}
  finally{clearTimeout(deadline);running=false;if(controller===current)controller=undefined;if(!stopped&&visible()){if(pending){pending=false;void run();}else timer=setTimeout(()=>void run(),interval);}}
 }
 const pause=()=>{clear();pending=false;controller?.abort();};
 const wake=()=>{if(!visible()){pause();return;}if(running){if(controller?.signal.aborted)pending=true;return;}if(Date.now()-lastStart<500){clear();timer=setTimeout(wake,500-(Date.now()-lastStart));return;}void run();};
 for(const event of ["focus","pageshow","online"])environment.window.addEventListener(event,wake);
 environment.window.addEventListener("offline",pause);
 for(const event of ["visibilitychange","resume"])environment.document.addEventListener(event,wake);
 environment.document.addEventListener("freeze",pause);void run();
 return()=>{stopped=true;pause();for(const event of ["focus","pageshow","online"])environment.window.removeEventListener(event,wake);environment.window.removeEventListener("offline",pause);for(const event of ["visibilitychange","resume"])environment.document.removeEventListener(event,wake);environment.document.removeEventListener("freeze",pause);};
}
