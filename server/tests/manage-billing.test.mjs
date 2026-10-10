import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingManager, verifySetup } from '../manage-billing.mjs';
const good = { id:'seti_test', livemode:false, status:'succeeded', customer:'cus_owner', metadata:{firebaseUid:'owner',subscriptionId:'sub_owner'}, payment_method:'pm_test' };
test('card changes reject foreign, pending, live and superseded setup intents', () => {
  assert.doesNotThrow(() => verifySetup(good,'owner','cus_owner','sub_owner','seti_test'));
  for (const patch of [{customer:'cus_other'},{status:'requires_payment_method'},{livemode:true},{metadata:{firebaseUid:'other',subscriptionId:'sub_owner'}},{payment_method:null}]) assert.throws(() => verifySetup({...good,...patch},'owner','cus_owner','sub_owner','seti_test'));
  assert.throws(() => verifySetup(good,'owner','cus_owner','sub_owner','seti_newer'));
});
test('management scopes subscriptions to owner and cancellation preserves paid period', async () => {
  const sub={id:'sub_owner',livemode:false,metadata:{firebaseUid:'owner',product:'roadguard-premium'},status:'active',cancel_at_period_end:false,items:{data:[{current_period_end:2000000000,price:{unit_amount:4999}}]},currency:'mxn',default_payment_method:{card:{brand:'visa',last4:'4242',exp_month:12,exp_year:2030}}};
  const changes=[];
  const stripe={subscriptions:{list:async()=>({data:[sub]}),update:async(id,change)=>{changes.push({id,change});Object.assign(sub,change);}}};
  const db={doc:()=>({get:async()=>({data:()=>({customerId:'cus_owner'})})})};
  const manager=createBillingManager(stripe,db);
  const result=await manager.cancel('owner',true);
  assert.equal(result.cancelAtPeriodEnd,true);assert.equal(result.status,'active');assert.equal(result.periodEnd,2000000000000);
  assert.deepEqual(changes,[{id:'sub_owner',change:{cancel_at_period_end:true}}]);
  await assert.rejects(manager.summary('other'));
  await assert.rejects(manager.cancel('owner','true'));
});
