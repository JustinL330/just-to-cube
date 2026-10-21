const labels={
 en:['Show','Hide','Show password','Hide password'],
 zh_hk:['顯示','隱藏','顯示密碼','隱藏密碼'],
 zh_cn:['显示','隐藏','显示密码','隐藏密码'],
 ja:['表示','非表示','パスワードを表示','パスワードを非表示'],
 ko:['표시','숨기기','비밀번호 표시','비밀번호 숨기기'],
 fr:['Afficher','Masquer','Afficher le mot de passe','Masquer le mot de passe'],
 de:['Anzeigen','Verbergen','Passwort anzeigen','Passwort verbergen']
};

// Enhance static account fields and password fields added by forum dialogs.
export function initPasswordVisibility({language,root=document}){
 const controls=new WeakMap();let nextId=0;
 function update(input,button){
  const text=labels[language()]||labels.en,visible=input.type==='text';
  button.textContent=text[visible?1:0];
  const field=input.labels?.[0]?.textContent?.trim();
  button.setAttribute('aria-label',text[visible?3:2]+(field?' · '+field:''));
  button.setAttribute('aria-pressed',String(visible));
 }
 function enhance(input){
  if(controls.has(input))return;
  const doc=input.ownerDocument,wrap=doc.createElement('div'),button=doc.createElement('button');
  wrap.className='password-field';button.className='password-toggle secondary';button.type='button';
  if(!input.id)input.id='password-field-'+(++nextId);
  input.dataset.passwordVisibility='';button.setAttribute('aria-controls',input.id);
  input.before(wrap);wrap.append(input,button);controls.set(input,button);
  button.addEventListener('click',()=>{input.type=input.type==='password'?'text':'password';update(input,button)});
  update(input,button);
 }
 function scan(node){
  if(node.matches?.('input[type="password"]'))enhance(node);
  node.querySelectorAll?.('input[type="password"]').forEach(enhance);
 }
 function refresh(){root.querySelectorAll('[data-password-visibility]').forEach(input=>update(input,controls.get(input)))}
 function hide(scope=root){scope.querySelectorAll('[data-password-visibility]').forEach(input=>{input.type='password';update(input,controls.get(input))})}
 scan(root);
 const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)scan(node)});
 observer.observe(root,{childList:true,subtree:true});
 root.addEventListener('reset',event=>hide(event.target),true);
 root.addEventListener('submit',event=>hide(event.target),true);
 root.addEventListener('close',event=>hide(event.target),true);
 root.addEventListener('visibilitychange',()=>{if(root.hidden)hide()});
 return {refresh,hide};
}
