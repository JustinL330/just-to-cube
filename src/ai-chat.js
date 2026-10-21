import {guideReply} from './coach-guides.js';
import {aiText} from './ai-i18n.js';
export function initAI({language,summary}){
  const $=s=>document.querySelector(s),t=k=>aiText(language(),k).replaceAll('{provider}',provider);
  const el=(tag,text,cls)=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n};
  let provider='AI',history=[],busy=false,configured=false,checking=true,controller=null,statusKey='aiChecking';
  const log=$('#aiMessages'),input=$('#aiInput'),form=$('#aiForm');
  function update(){
    document.querySelectorAll('[data-ai]').forEach(e=>e.textContent=t(!configured&&['ai','aiPrivacy','aiIntro'].includes(e.dataset.ai)?e.dataset.ai+'Guide':e.dataset.ai));
    const providerLink=$('#aiProviderLink');providerLink.href=provider==='DeepSeek'?'https://platform.deepseek.com':'https://build.nvidia.com';providerLink.textContent=(provider==='DeepSeek'?'DeepSeek':'NVIDIA')+' ↗';
    input.placeholder=t('aiInput');input.setAttribute('aria-label',t('aiInput'));
    log.setAttribute('aria-label',t(configured?'ai':'aiGuide'));
    $('#aiSend').disabled=busy||!input.value.trim();
    input.disabled=false;$('#aiShare').disabled=!configured;$('#aiStop').hidden=!busy;$('#aiRetry').hidden=busy||configured;
    $('#aiStatus').textContent=t(busy?'aiThinking':statusKey);
    $('#aiEmpty').hidden=log.childElementCount>0||busy;$('#aiClear').disabled=busy;
    $('#aiSummaryPreview').hidden=!configured||!$('#aiShare').checked;
    $('#aiSummaryText').textContent=summary();
  }
  function message(role,content){const n=el('div',content,'ai-message '+role);log.append(n);n.scrollIntoView({block:'nearest'});return n}
  async function check(){checking=true;statusKey='aiChecking';update();
    try{const r=await fetch('/api/ai',{signal:AbortSignal.timeout(10000),cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();configured=d.configured===true;provider=['DeepSeek','NVIDIA'].includes(d.provider)?d.provider:'AI';statusKey=configured?'aiReady':'aiGuideReady'}
    catch{configured=false;statusKey='aiGuideReady'}finally{checking=false;update()}
  }
  async function send(e){e.preventDefault();const question=input.value.trim();if(busy||!question)return;
    if(!configured){message('user',question);message('assistant',t('aiGuideReady')+'\n\n'+guideReply(question,language()));input.value='';update();input.focus();return}
    const messages=[...history,{role:'user',content:question}].slice(-11);
    // Bound history by characters as well as turns. Remove complete pairs.
    while(messages.length>1&&messages.reduce((n,m)=>n+m.content.length,0)>15000)messages.splice(0,2);
    const userNode=message('user',question);input.value='';busy=true;$('#aiError').textContent='';controller=new AbortController();update();
    const timeout=setTimeout(()=>controller?.abort('timeout'),50000);
    try{const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,language:language(),...($('#aiShare').checked?{summary:summary()}:{})}),signal:controller.signal});
      const d=await r.json();if(!r.ok){const k=d.error==='provider_balance'?'aiBalance':d.error==='rate_limited'?'aiLimited':d.error==='timeout'?'aiTimeout':['not_configured','provider_auth','model_unavailable'].includes(d.error)?'aiSetup':'aiUnavailable';if(k==='aiSetup'){configured=false;statusKey=k}throw Error(k)}
      if(typeof d.message!=='string'||!d.message.trim())throw Error('aiUnavailable');
      message('assistant',d.message);history=[...messages,{role:'assistant',content:d.message.slice(0,4000)}];
      if(d.truncated)$('#aiError').textContent=t('aiTruncated');
    }catch(error){userNode.remove();input.value=question;if(controller.signal.aborted&&controller.signal.reason==='stopped'){}
      else {configured=false;statusKey='aiGuideReady';history=[];message('user',question);message('assistant',t('aiGuideReady')+'\n\n'+guideReply(question,language()));input.value='';$('#aiError').textContent=(error.message==='aiBalance'?t('aiBalance')+' ':'')+t('aiFallback');}
    }finally{clearTimeout(timeout);busy=false;controller=null;update();if(configured)input.focus()}
  }
  form.addEventListener('submit',send);input.addEventListener('input',update);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit()}});
  $('#aiStop').onclick=()=>controller?.abort('stopped');
  $('#aiClear').onclick=()=>{if(busy)return;history=[];log.replaceChildren();$('#aiError').textContent='';input.value='';update()};
  $('#aiRetry').onclick=()=>{if(!checking)check()};$('#aiShare').onchange=update;
  document.querySelectorAll('[data-ai-prompt]').forEach(button=>button.onclick=()=>{input.value=t(button.dataset.aiPrompt);update();input.focus()});
  update();check();return update;
}
