export type CohortId = "C2" | "C3" | "C4";
export type Audience = "engaged" | CohortId;
export type Stage = "portal" | "start" | "confirm" | "pay";
export type Rates = Record<Stage, number>;
export type CohortRates = { current: Rates; adaptive: Rates };
export type Inputs = {
  audience: Audience; population: number; reach: number; investment: number;
  support: number; sms: number; turns: number; turnCost: number; ongoing: number;
  cashMultiplier: number; incrementality: number; months: number;
  rates: Record<CohortId, CohortRates>;
};
export const cohortIds: CohortId[] = ["C2", "C3", "C4"];
export const stages: Stage[] = ["portal", "start", "confirm", "pay"];
export const stageNames: Record<Stage,string> = { portal:"Open the portal",start:"Start a plan",confirm:"Confirm the plan",pay:"Make a first plan payment" };
export const cohortNames: Record<CohortId,string> = { C2:"Clicked, no portal visit",C3:"Visited portal, no plan start",C4:"Started a plan, not confirmed" };
export const sourceCohorts: {cohort_id:CohortId;consumers:number;paid_30d:number;plan_confirmed_30d:number;cash_collected_30d_usd:number}[] = [
  {cohort_id:"C2",consumers:10000,paid_30d:1800,plan_confirmed_30d:1000,cash_collected_30d_usd:306000},
  {cohort_id:"C3",consumers:6000,paid_30d:1800,plan_confirmed_30d:900,cash_collected_30d_usd:324000},
  {cohort_id:"C4",consumers:2000,paid_30d:1000,plan_confirmed_30d:600,cash_collected_30d_usd:190000},
];
export const sourcePopulation: Record<Audience,number> = {engaged:18000,C2:10000,C3:6000,C4:2000};
export const defaults: Inputs = {
  audience:"engaged",population:18000,reach:60,investment:50000,support:2,sms:0,
  turns:0,turnCost:.01,ongoing:0,cashMultiplier:1,incrementality:100,months:12,
  rates:{
    C2:{current:{portal:50,start:40,confirm:50,pay:70},adaptive:{portal:500/7,start:40,confirm:50,pay:70}},
    C3:{current:{portal:100,start:50,confirm:30,pay:70},adaptive:{portal:100,start:450/7,confirm:30,pay:70}},
    C4:{current:{portal:100,start:100,confirm:30,pay:70},adaptive:{portal:100,start:100,confirm:240/7,pay:70}},
  },
};
export function relevantStage(id:CohortId,stage:Stage){return !(stage==="portal" && id!=="C2") && !(stage==="start" && id==="C4");}
export function calculateConversation(inputs:Inputs){
  const selected=sourceCohorts.filter(row=>inputs.audience==="engaged" || row.cohort_id===inputs.audience);
  const weight=selected.reduce((sum,row)=>sum+row.consumers,0);
  const rows=selected.map(row=>{
    const id=row.cohort_id;
    const population=inputs.population*row.consumers/weight;
    const reached=population*inputs.reach/100;
    function progress(rates:Rates){
      let remaining=reached;
      const counts: Rates={portal:0,start:0,confirm:0,pay:0};
      for(const stage of stages){remaining*=relevantStage(id,stage)?rates[stage]/100:1;counts[stage]=remaining;}
      return counts;
    }
    const current=progress(inputs.rates[id].current), adaptive=progress(inputs.rates[id].adaptive);
    const raw=(adaptive.pay-current.pay)*inputs.incrementality/100;
    const baselinePaidRate=row.paid_30d/row.consumers;
    const payers=Math.max(-reached*baselinePaidRate,Math.min(raw,reached*(1-baselinePaidRate)));
    const cash=payers*row.cash_collected_30d_usd/row.paid_30d*inputs.cashMultiplier;
    return {id,population,reached,current,adaptive,payers,cash};
  });
  const sum=(key:"population"|"reached"|"payers"|"cash")=>rows.reduce((total,row)=>total+row[key],0);
  const reached=sum("reached"),cash=sum("cash");
  const support=reached*inputs.support/100*6,sms=reached*inputs.sms*.035,ai=reached*inputs.turns*inputs.turnCost;
  const contribution=cash*.13-support-sms-ai-inputs.ongoing;
  const progression=stages.map(stage=>({stage,current:rows.reduce((n,row)=>n+row.current[stage],0),adaptive:rows.reduce((n,row)=>n+row.adaptive[stage],0)}));
  return {population:sum("population"),reached,payers:sum("payers"),cash,fees:cash*.15,payment:cash*.02,support,sms,ai,contribution,
    horizon:contribution*inputs.months,annual:contribution*12,netAfterBuild:contribution*inputs.months-inputs.investment,
    payback:contribution>0?inputs.investment/contribution:null,progression,rows};
}
