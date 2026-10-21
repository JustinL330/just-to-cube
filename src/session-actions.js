export function clearSessionResults(session){
  return session.solves.splice(0);
}

export function restoreSessionResults(session,removed){
  const present=new Set(session.solves.map(s=>s.id));
  session.solves=[...removed.filter(s=>!present.has(s.id)),...session.solves];
}

export function initSessionActions({getData,getSession,t,persist,render,toast,onClear}){
  const $=s=>document.querySelector(s),dialog=$('#clearSessionDialog');
  let pending=null;
  function open(){
    const session=getSession();if(!session.solves.length)return;
    pending={owner:getData(),session,solves:[...session.solves]};
    $('#clearSessionName').textContent=session.name+' · '+session.event;
    $('#clearSessionCount').textContent=t('clearSessionConfirm').replace('{count}',String(session.solves.length));
    if(!dialog.open)dialog.showModal();
    $('#cancelClearSession').focus();
  }
  $('#clearSessionResults').onclick=open;
  $('#cancelClearSession').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{pending=null});
  $('#confirmClearSession').onclick=()=>{
    const target=pending;
    if(!target||target.owner!==getData()||!target.owner.sessions.includes(target.session)){dialog.close();return}
    // If the list changed while the dialog was open, show the new count first.
    if(target.solves.length!==target.session.solves.length||target.solves.some((s,i)=>s!==target.session.solves[i])){open();return}
    const removed=clearSessionResults(target.session);
    dialog.close();persist();render();onClear?.();
    toast(t('sessionCleared').replace('{count}',String(removed.length)),()=>{
      if(target.owner!==getData()||!target.owner.sessions.includes(target.session))return;
      restoreSessionResults(target.session,removed);persist();render();$('#toast').hidden=true;
    });
  };
}
