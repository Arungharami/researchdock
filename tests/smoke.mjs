// Production HTTP smoke check for setup preview; requires npm run build first.
// This deliberately does not claim a configured authentication/database test.
import assert from 'node:assert/strict';
import http from 'node:http';
import next from 'next';
const app=next({dev:false,hostname:'127.0.0.1',port:0});
await app.prepare();
const server=http.createServer(app.getRequestHandler());
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const {port}=server.address();
 for(const path of ['/','/explore?q=sensor+drift','/about','/policies','/auth','/auth?mode=register','/submit','/dashboard','/moderation','/projects/new']){
  const res=await fetch(`http://127.0.0.1:${port}${path}`);const html=await res.text();assert.equal(res.status,200);assert.match(html,/ResearchDock/);assert.match(html,/Supabase is not connected/);console.log('PASS',path);
 }
 const invalid=await fetch(`http://127.0.0.1:${port}/resources/not-a-uuid`);assert.match(await invalid.text(),/Resource unavailable/);console.log('PASS invalid resource is unavailable');
}finally{server.close();await app.close();}
