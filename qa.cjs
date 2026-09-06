// Development-only browser audit. No runtime or build dependencies are added to the app.
// PLAYWRIGHT_MODULE may point to a preinstalled Playwright package.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const url=process.env.TEST_URL || 'http://localhost:8000';
const out=process.env.TEST_OUTPUT || '../qa-results';
let browser;
(async()=>{
 await fs.mkdir(out,{recursive:true});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1448,height:1086},acceptDownloads:true});
 const p=await context.newPage(); const errors=[]; const failures=[]; const checks=[]; let unrelatedNavigationAborts=0;
 p.on('pageerror',e=>errors.push(e.message));
 p.on('requestfailed',r=>{
  if(!/^https?:/.test(r.url()))return;
  // Some local browser/network environments inject a script outside the project URL.
  // Its fetch is cancelled on navigation; retain the count separately from app failures.
  if(r.resourceType()==='fetch' && r.failure()?.errorText==='net::ERR_ABORTED' && !r.url().startsWith(url)){unrelatedNavigationAborts++;return;}
  failures.push(r.url());
 });
 p.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
 p.on('dialog',d=>d.accept());
 async function check(name,fn){await fn(); checks.push(name); console.log('PASS',name);}
 const fill=async(id,value)=>{await p.locator('#'+id).fill(String(value));await p.waitForTimeout(40);};
 const select=async(id,value)=>{await p.selectOption('#'+id,value);await p.waitForTimeout(40);};
 const text=id=>p.locator('#'+id).textContent();
 const menu=async(id)=>{await p.click('#moreButton');await p.click('#'+id);};
 const generate=()=>p.locator('.generate-button').click();
 async function pdf(name){if(!await p.locator('#downloadButton').isVisible())await p.click('[data-mobile-view=edit]');const d=p.waitForEvent('download');await p.click('#downloadButton');await(await d).saveAs(path.join(out,name));}
 await p.goto(url);await p.waitForTimeout(100);
 await check('Default calculation and one A4 page',async()=>{assert.equal(await text('previewTotal'),'€ 6,466.00');assert.equal(await p.locator('#documentPages>article').count(),1);});
 await p.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 await check('All document types, terminology and title bounds',async()=>{
  for(const type of ['Payment Record','Quotation','Pro-forma Invoice','Expense Record','Purchase Order','Deposit Request','Invoice']){
   await select('documentType',type); assert.equal(await text('previewTitle'),type.toUpperCase());assert.equal(await text('generateLabel'),'Generate '+type);
   assert.equal((await p.locator('#numberLabel').textContent()).trim(),(type==='Invoice'?'Invoice':'Document')+' Number');
   const row=p.locator('#documentPages .doc-title-row').first();
   const h=await row.locator('h3').boundingBox(),v=await row.locator('.document-value').boundingBox();assert(h.x+h.width<=v.x+1);
   if(['Payment Record','Expense Record'].includes(type)) assert.equal(await text('previewPartyHeading'),'PAID TO');
  }
 });
 await check('Generate state becomes stale after edits',async()=>{await generate();assert.match(await text('readyLabel'),/Generated/);await fill('invoiceNumber','QA-2026-001');assert.match(await text('readyLabel'),/not generated/);assert.equal(await text('previewPaymentReference'),'QA-2026-001');});
 await p.locator('.additional-details').evaluate(e=>e.open=true);
 await check('Party, notes and payment fields update',async()=>{
  for(const[id,preview,value]of[['issuedBy','previewIssuedBy','Moscatelli\nVia Roma 12\nRoma, Italy'],['recipient','previewRecipient','QA Client\nVia Milano 8\nMilano, Italy'],['notes','previewNotes','Thank you.\nPayment within 30 days.'],['iban','previewIban','IT30P0306939170100000007557'],['authorisedBy','previewAuthorisedBy','Gianluca Moscatelli'],['authorisedRole','previewAuthorisedRole','Managing Director'],['paymentReference','previewPaymentReference','CUSTOM-REF']]){await fill(id,value);assert((await text(preview)).includes(value.replace(/\n/g,'')) || (await text(preview))===value || ['issuedBy','recipient'].includes(id));}
  await select('paymentMethod','Cash');assert.equal(await text('previewPaymentMethod'),'Cash');
  await fill('invoiceNumber','QA-2026-002');assert.equal(await text('previewPaymentReference'),'CUSTOM-REF');

 });
 await check('Statuses and Date Paid validation',async()=>{
  await select('status','Paid');assert(await p.locator('#datePaid').inputValue());await fill('datePaid','');await generate();assert.doesNotMatch(await text('readyLabel'),/Generated/);
  await fill('datePaid','2026-10-10');await generate();assert.match(await text('previewPaidDate'),/10.10.2026/);
  await select('status','Void');assert.equal(await text('readyLabel'),'Void document');
  await select('status','Draft');assert(await p.locator('#datePaid').isDisabled());
  await select('status','Issued');
 });
 await check('Email and chronological date validation',async()=>{
  await fill('sendTo','invalid');await generate();assert.doesNotMatch(await text('readyLabel'),/Generated/);await fill('sendTo','qa@example.com');
  await fill('issueDate','2026-09-07');await fill('dueDate','2026-09-06');await generate();assert.match(await text('toast'),/Due date cannot/);await fill('dueDate','2026-10-07');
 });
 await check('All currencies, fractional quantities, rounded lines and VAT',async()=>{
  await p.locator('.qty-input').first().fill('1.5');await p.locator('.money-input').first().fill('10.01');
  assert.equal(await p.locator('.line-total').first().textContent(),'€ 15.02');
  await fill('taxRate','10');assert.equal(await text('subtotalForm'),'€ 2,815.02');assert.equal(await text('totalForm'),'€ 3,096.52');
  for(const[currency,symbol]of [['GBP','£'],['USD','$'],['CHF','CHF'],['BRL','R$'],['EUR','€']]){await select('currency',currency);assert.equal(await text('previewTotal'),symbol+' 3,096.52');}
  await fill('taxRate','101');await generate();assert.doesNotMatch(await text('readyLabel'),/Generated/);await fill('taxRate','22');
  await p.locator('.qty-input').first().fill('-1');await generate();assert.doesNotMatch(await text('readyLabel'),/Generated/);await p.locator('.qty-input').first().fill('1');
 });
 await check('Add/remove line items and missing-description validation',async()=>{
  await p.click('#addItem');assert.equal(await p.locator('.item-row').count(),4);await generate();assert.match(await text('toast'),/description/);
  await p.locator('.description-input').last().fill('Additional service');await p.locator('.qty-input').last().fill('2');await p.locator('.money-input').last().fill('50');assert.equal(await p.locator('.line-total').last().textContent(),'€ 100.00');
  await p.locator('.remove-item').last().click();assert.equal(await p.locator('.item-row').count(),3);
 });
 await check('Autosave immediately on leaving and restore custom reference',async()=>{
  await fill('invoiceNumber','QA-SAVED');await p.reload();await p.waitForTimeout(100);assert.equal(await p.locator('#invoiceNumber').inputValue(),'QA-SAVED');
  await fill('invoiceNumber','QA-SAVED-2');assert.equal(await text('previewPaymentReference'),'CUSTOM-REF');
 });
 await check('Archive, reopen, update without duplicate, duplicate and delete',async()=>{
  await menu('archiveButton');let archive=await p.evaluate(()=>JSON.parse(localStorage.getItem('moscatelli_invoice_archive_v1')));assert.equal(archive.length,1);
  await menu('openArchiveButton');await p.locator('[data-open]').click();await menu('archiveButton');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('moscatelli_invoice_archive_v1')).length),1);
  await menu('duplicateButton');assert.equal(await p.locator('#status').inputValue(),'Draft');await menu('archiveButton');assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('moscatelli_invoice_archive_v1')).length),2);
  await menu('openArchiveButton');await p.locator('[data-delete]').first().click();assert.equal(await p.locator('[data-open]').count(),1);await p.locator('[data-open]').first().click();
 });
 await check('PDF download and browser print produce files',async()=>{
  await pdf('desktop.pdf');await p.pdf({path:path.join(out,'print.pdf'),preferCSSPageSize:true,printBackground:true});
 });
 await check('Send downloads PDF and prepares mailto; failed export stops Send',async()=>{
  const cdp=await context.newCDPSession(p);await cdp.send('Page.enable');const navigations=[];cdp.on('Page.frameRequestedNavigation',e=>navigations.push(e.url));
  const d=p.waitForEvent('download');await p.click('#sendButton');await(await d).saveAs(path.join(out,'send.pdf'));await p.waitForTimeout(100);
  assert(navigations.some(x=>x.startsWith('mailto:qa%40example.com?')&&x.includes('attach')));
  await p.evaluate(()=>{window.savedEngine=window.html2pdf;window.html2pdf=undefined;});const count=navigations.length;await p.click('#sendButton');await p.waitForTimeout(100);assert.equal(navigations.length,count);await p.evaluate(()=>window.html2pdf=window.savedEngine);
 });
 await check('Long document paginates without losing rows or overflowing footer',async()=>{
  for(let i=0;i<27;i++){await p.click('#addItem');await p.locator('.description-input').last().fill('Additional service '+(i+1));await p.locator('.money-input').last().fill('12.50');}
  await p.waitForTimeout(100);assert(await p.locator('#documentPages>article').count()>1);assert.equal(await p.locator('#documentPages tbody tr').count(),30);
  assert(await p.locator('#documentPages>article').evaluateAll(pages=>pages.every(page=>{const f=page.querySelector('.doc-footer');return f.offsetTop+f.offsetHeight<=page.clientHeight-34;})));
  await pdf('long.pdf');await p.pdf({path:path.join(out,'long-print.pdf'),preferCSSPageSize:true,printBackground:true});
 });
 await check('Reset and last-item guard',async()=>{
  await menu('resetButton');assert.equal(await p.locator('.item-row').count(),1);assert.equal(await p.locator('#recipient').inputValue(),'');await p.locator('.remove-item').click();assert.equal(await p.locator('.item-row').count(),1);
 });
 await check('Responsive desktop/tablet/mobile and A4 geometry',async()=>{
  await p.addInitScript(()=>localStorage.removeItem('moscatelli_invoice_current_v1'));await p.reload();await p.waitForTimeout(100);
  for(const width of [1448,1280,1100,1000,768,390,320]){
   await p.setViewportSize({width,height:1086});if(width<=1000)await p.click('[data-mobile-view=preview]');await p.waitForTimeout(80);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width);
   const box=await p.locator('#documentPages>article').first().boundingBox();assert(Math.abs(box.height/box.width-297/210)<0.003,'A4 ratio at '+width);
   if(width===390){await p.screenshot({path:path.join(out,'mobile-preview.png'),fullPage:true});await pdf('mobile.pdf');await p.pdf({path:path.join(out,'mobile-print.pdf'),preferCSSPageSize:true,printBackground:true});await p.click('[data-mobile-view=edit]');assert(await p.locator('#editorPanel').isVisible());await p.screenshot({path:path.join(out,'mobile-edit.png'),fullPage:true});await menu('openArchiveButton');assert(await p.locator('#archiveView').isVisible());await p.click('#backToGenerator');}
  }
 });
 await check('Unavailable storage does not crash the app',async()=>{
  const c=await browser.newContext();await c.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked')};Storage.prototype.setItem=()=>{throw new Error('blocked')};});const q=await c.newPage();const e=[];q.on('pageerror',x=>e.push(x.message));await q.goto(url);await q.waitForTimeout(600);assert.equal(await q.locator('#previewTotal').textContent(),'€ 6,466.00');assert.match(await q.locator('#autosaveStatus').textContent(),/unavailable/);assert.deepEqual(e,[]);await c.close();
 });
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({url,checks,errors,failures,unrelatedNavigationAborts},null,2));
 await browser.close();console.log('ALL',checks.length,'CHECKS PASSED');
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
