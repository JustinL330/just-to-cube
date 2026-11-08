const safeLink=value=>{
 try{
  const url=new URL(value,location.href);
  return ['http:','https:','mailto:'].includes(url.protocol)?url.href:null;
 }catch{return null}
};

function inline(parent,text,depth=0){
 if(!text)return;
 if(depth>5){parent.append(document.createTextNode(text));return}
 const token=/(`+)([^`\n]+?)\1|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|~~([^~\n]+)~~|\*([^*\n]+)\*|_([^_\n]+)_|<(https?:\/\/[^ >]+)>/g;
 let start=0,match;
 while((match=token.exec(text))){
  if(match.index>start)parent.append(document.createTextNode(text.slice(start,match.index)));
  let node;
  if(match[1]){node=document.createElement('code');node.textContent=match[2]}
  else if(match[3]){
   const href=safeLink(match[4]);
   if(href){node=document.createElement('a');node.href=href;node.target='_blank';node.rel='noopener noreferrer';inline(node,match[3],depth+1)}
   else node=document.createTextNode(match[0]);
  }else if(match[5]||match[6]){node=document.createElement('strong');inline(node,match[5]||match[6],depth+1)}
  else if(match[7]){node=document.createElement('del');inline(node,match[7],depth+1)}
  else if(match[8]||match[9]){node=document.createElement('em');inline(node,match[8]||match[9],depth+1)}
  else{const href=safeLink(match[10]);node=document.createElement('a');node.href=href;node.target='_blank';node.rel='noopener noreferrer';node.textContent=match[10]}
  parent.append(node);start=token.lastIndex;
 }
 if(start<text.length)parent.append(document.createTextNode(text.slice(start)));
}

const listLine=line=>line.match(/^ {0,3}([-+*]|\d+\.)\s+(.+)$/);
const blockStart=line=>/^ {0,3}(```|#{1,6}\s+|>\s?|([-+*]|\d+\.)\s+|([-*_])(?:\s*\3){2,}\s*$)/.test(line);

function blocks(parent,source){
 const lines=String(source??'').replaceAll('\r\n','\n').replaceAll('\r','\n').split('\n');
 for(let i=0;i<lines.length;){
  const line=lines[i];
  if(!line.trim()){i++;continue}
  const fence=line.match(/^ {0,3}```\s*([\w-]*)\s*$/);
  if(fence){
   const content=[];i++;while(i<lines.length&&!/^ {0,3}```\s*$/.test(lines[i]))content.push(lines[i++]);if(i<lines.length)i++;
   const pre=document.createElement('pre'),code=document.createElement('code');if(fence[1])code.className='language-'+fence[1];code.textContent=content.join('\n');pre.append(code);parent.append(pre);continue;
  }
  const heading=line.match(/^ {0,3}(#{1,6})\s+(.+)$/);
  if(heading){const h=document.createElement('h'+heading[1].length);inline(h,heading[2]);parent.append(h);i++;continue}
  if(/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)){parent.append(document.createElement('hr'));i++;continue}
  if(/^ {0,3}>/.test(line)){
   const quote=[];while(i<lines.length&&/^ {0,3}>/.test(lines[i]))quote.push(lines[i++].replace(/^ {0,3}> ?/,''));const q=document.createElement('blockquote');blocks(q,quote.join('\n'));parent.append(q);continue;
  }
  const first=listLine(line);
  if(first){
   const ordered=/\d+\./.test(first[1]),list=document.createElement(ordered?'ol':'ul');
   while(i<lines.length){const item=listLine(lines[i]);if(!item||/\d+\./.test(item[1])!==ordered)break;const li=document.createElement('li');inline(li,item[2]);list.append(li);i++}
   parent.append(list);continue;
  }
  const paragraph=[];
  while(i<lines.length&&lines[i].trim()&&(!paragraph.length||!blockStart(lines[i])))paragraph.push(lines[i++]);
  const p=document.createElement('p');paragraph.forEach((part,index)=>{if(index)p.append(document.createElement('br'));inline(p,part)});parent.append(p);
 }
}

export function renderMarkdown(container,text){
 container.replaceChildren();container.classList.add('markdown-body');blocks(container,text);return container;
}
