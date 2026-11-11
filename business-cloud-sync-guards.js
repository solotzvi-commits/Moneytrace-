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
 function sameAccount(operation,active){
  return !!operation&&!!active&&!!operation.userId&&operation.userId===active.userId;
 }
 function isCurrent(operation,active){
  return sameAccount(operation,active)&&operation.generation===active.generation;
 }
 return Object.freeze({pendingKey,sameAccount,isCurrent});
});
