// Fixtures for the mocked API. Edit freely: the shapes mirror the real DTOs.
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({alg:'none'})}.${b64({sub:'subhrajit',email:'s@x.com',nameid:'u1',exp:Math.floor(Date.now()/1000)+36000})}.x`;
const ok = v => ({ isSuccess:true, value:v });
const now = Date.now();
const today = new Date().toISOString();

const cats = [
 {id:1,name:'Food',isTransferCategory:false}, {id:2,name:'Grocery',isTransferCategory:false,parentCategoryId:1,parentCategoryName:'Food'},
 {id:3,name:'Dining',isTransferCategory:false,parentCategoryId:1,parentCategoryName:'Food'}, {id:4,name:'Travel',isTransferCategory:false},
 {id:5,name:'Fuel',isTransferCategory:false,parentCategoryId:4,parentCategoryName:'Travel'}, {id:6,name:'Rent',isTransferCategory:false}];
const bp = (id,name,amt,spent,status)=>({budgetId:id,transactionCategoryId:id,categoryName:name,budgetAmount:amt,spentAmount:spent,remainingAmount:amt-spent,percentageUsed:spent/amt*100,period:1,startDate:today,alertThresholdPercent:80,hasThresholdOverride:false,periodStart:today,periodEnd:today,daysTotal:30,daysElapsed:15,expectedPercent:50,projectedSpend:spent*2,dailyAllowance:(amt-spent)/15,daysRemainingInPeriod:15,status});
const budgets = [bp(1,'Food',10000,8500,'alert'), bp(4,'Travel',5000,5600,'over'), bp(9,undefined,40000,18000,'safe')];
const dashboard = { budgets, totalBudgeted:55000,totalSpent:32100,totalRemaining:22900,percentUsed:58,safeCount:1,alertCount:1,overCount:1,periodStart:today,periodEnd:today,daysLeft:15,
  history:[{label:'Jun',spent:30000,budgeted:50000},{label:'Jul',spent:42000,budgeted:50000},{label:'Aug',spent:51000,budgeted:50000}],recentAlerts:[],alertsThisPeriod:2,settings:{defaultAlertPercent:80,toastAlerts:true,emailAlerts:false},monthStartDay:1};
const breakdown = (id, cat) => {
  if (cat==1||id==1) return {budgetId:1,name:'Food',budgetAmount:10000,totalSpent:8500,level:'sub-categories',rows:[
    {categoryId:2,name:'Grocery',spent:5200,transactionCount:11,shareOfSpend:61.2,percentOfBudget:52,hasSubCategories:false},
    {categoryId:3,name:'Dining',spent:2600,transactionCount:6,shareOfSpend:30.6,percentOfBudget:26,hasSubCategories:false},
    {categoryId:1,name:'Directly in Food',spent:700,transactionCount:2,shareOfSpend:8.2,percentOfBudget:7,hasSubCategories:false}]};
  return {budgetId:id,name:'All spending',budgetAmount:40000,totalSpent:18000,level:'categories',rows:[
    {categoryId:1,name:'Food',spent:8500,transactionCount:19,shareOfSpend:47.2,percentOfBudget:21,hasSubCategories:true},
    {categoryId:6,name:'Rent',spent:8000,transactionCount:1,shareOfSpend:44.4,percentOfBudget:20,hasSubCategories:false},
    {categoryId:null,name:'Uncategorised',spent:1500,transactionCount:3,shareOfSpend:8.4,percentOfBudget:4,hasSubCategories:false}]};
};
const summary = {netWorth:312000,monthlyIncome:85000,monthlyExpenses:32100,broughtForwardAmount:0,realAvailableCash:98000,reservedForPayment:12000,liquidCash:110000,creditCardDebt:12000,upcomingObligationsTotal:15000,safeToSpend:83000,obligationWindowDays:30};
const tx = (id,d,a,c)=>({id,description:d,amount:a,date:today,categoryName:c,accountName:'Bank A',type:1});
const insights = {highestAmountTransactions:[tx(1,'Salary',85000,'Salary')].map(t=>({...t,type:0})).concat([tx(2,'Rent',8000,'Rent')]),lowestAmountTransactions:[],latestTransactions:[],oldestTransactions:[],categoryExtremes:[{groupName:'Food',maxTransaction:tx(3,'Big Bazaar',2100,'Food'),minTransaction:tx(4,'Tea',20,'Food')}],accountExtremes:[]};
const undoable = [
 {transactionId:11,accountId:1,accountName:'Slice Bank',description:'Lunch',amount:100,type:1,date:today,categoryName:'Food › Grocery',deletedAt:today,secondsLeft:420,canUndo:true,balanceNow:12000,balanceAfter:11900,isLiability:false,budget:{name:'Food',budgetAmount:10000,spentNow:8400,spentAfter:8500,alertThresholdPercent:80}},
 {transactionId:12,accountId:2,accountName:'HDFC Card',description:'Fuel',amount:2500,type:1,date:today,categoryName:'Travel › Fuel',deletedAt:today,secondsLeft:45,canUndo:true,balanceNow:-3000,balanceAfter:-5500,isLiability:true,budget:null},
 {transactionId:13,accountId:1,accountName:'Slice Bank',description:'Big refund',amount:9000,type:0,date:today,categoryName:null,deletedAt:today,secondsLeft:300,canUndo:false,blockedReason:'Putting this back would overdraw the account.',balanceNow:500,balanceAfter:-8500,isLiability:false,budget:null}];

const CORS={'access-control-allow-origin':'http://localhost:4300','access-control-allow-credentials':'true'};

const accounts = [{id:1,name:'Cash wallet'},{id:2,name:'Slice Bank'}];
const quickCards = [
  {description:'Bus',amount:16,type:1,transactionCategoryId:7,accountId:1,count:23,lastUsed:today},
  {description:'Auto',amount:18,type:1,transactionCategoryId:7,accountId:1,count:14,lastUsed:today},
  {description:'Tea',amount:20,type:1,transactionCategoryId:3,accountId:2,count:5,lastUsed:today}];
cats.push({id:7,name:'Transport',isTransferCategory:false});
module.exports = { accounts, quickCards, jwt, ok, cats, budgets, dashboard, breakdown, summary, insights, undoable };
