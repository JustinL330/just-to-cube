import {spawn} from 'node:child_process';
// Ignore preview-host CLI flags: Wrangler calls this interface --ip instead.
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','dev','dist','--port',process.env.PORT||'4173','--ip','0.0.0.0','--binding','LOCAL_DEV=1'],{stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
