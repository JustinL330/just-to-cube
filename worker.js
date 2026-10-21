import {handleSearch} from './src/search-worker.js';
import {handleMessages} from './src/messages-worker.js';
import {handleAI} from './src/ai-worker.js';
import {handleForum} from './src/forum-worker.js';
import {handleAccount} from './src/account-worker.js';
export default {async fetch(request,env,ctx){
const url=new URL(request.url); if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
if(url.pathname.startsWith('/api/forum/'))return handleForum(request,env);
if(url.pathname==='/api/messages'||url.pathname.startsWith('/api/messages/'))return handleMessages(request,env);
if(url.pathname==='/api/ai')return handleAI(request,env);
if(url.pathname.startsWith('/api/account/')||url.pathname==='/api/checkins'||url.pathname.startsWith('/api/checkins/'))return handleAccount(request,env);
return handleSearch(request,ctx);
}};

