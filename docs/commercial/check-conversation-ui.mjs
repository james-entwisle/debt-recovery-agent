import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {calculateConversation,defaults,sourceCohorts} from "../../apps/web/src/components/conversation-economics-calculation.ts";
const saved=JSON.parse(readFileSync(new URL("conversation-scenarios.json",import.meta.url),"utf8"));
assert.deepEqual(defaults,saved.assumptions);
const [header,...lines]=readFileSync(new URL("../../brief/03_historical_cohorts.csv",import.meta.url),"utf8").trim().split(/\r?\n/);
const keys=header.split(',');
const csv=lines.map(line=>Object.fromEntries(line.split(',').map((cell,index)=>[keys[index],cell])));
for(const row of sourceCohorts){const source=csv.find(x=>x.cohort_id===row.cohort_id);assert.ok(source);for(const key of ['consumers','paid_30d','plan_confirmed_30d','cash_collected_30d_usd'])assert.equal(row[key],Number(source[key]));}
for(const test of saved.cases){const actual=calculateConversation(test.inputs);for(const key of ['population','reached','payers','cash','fees','payment','support','sms','ai','contribution','annual','horizon','netAfterBuild','payback']){const want=test.result[key];if(want===null)assert.equal(actual[key],null);else assert.ok(Math.abs(actual[key]-want)<1e-7,`${test.name} ${key}: ${actual[key]} != ${want}`);}for(let i=0;i<4;i++)for(const side of ['current','adaptive'])assert.ok(Math.abs(actual.progression[i][side]-test.result.progression[i][side])<1e-7);}
console.log(`UI graduation calculator matches CSV and ${saved.cases.length} independently reproduced progression/cost cases`);
