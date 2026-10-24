export const installDismissedKey="pedido.pwa.install.dismissed.v1";
let dismissedInSession=false;
export function installWasDismissed(storage:Pick<Storage,"getItem">){try{return dismissedInSession||storage.getItem(installDismissedKey)==="1";}catch{return dismissedInSession;}}
export function dismissInstall(storage:Pick<Storage,"setItem">){dismissedInSession=true;try{storage.setItem(installDismissedKey,"1");}catch{}}
