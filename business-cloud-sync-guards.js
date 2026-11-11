/* Testable account-scoped guards for Business Mode cloud persistence. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.MTBusinessCloudSyncGuards=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 function pendingKey(userId){
  return 'moneytrace_business_pending_sync_v1_user_'+(userId||'local');
 }
 function isCurrent(operation,active){
  return !!operation&&!!active&&
   operation.userId===active.userId&&
   operation.generation===active.generation;
 }
 return Object.freeze({pendingKey,isCurrent});
});
