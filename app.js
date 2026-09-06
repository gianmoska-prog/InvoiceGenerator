(() => {
  'use strict';

  const DRAFT_KEY = 'moscatelli_invoice_current_v1';
  const ARCHIVE_KEY = 'moscatelli_invoice_archive_v1';
  let items = [];
  let currentArchiveId = null;
  let autosaveTimer;
  let layoutFrame;
  let exporting = false;
  let layoutError = false;
  let generated = false;

  const $ = (id) => document.getElementById(id);
  const form = $('invoiceForm');
  const workspace = $('workspace');
  const itemContainer = $('itemsContainer');

  const els = {
    documentType: $('documentType'), status: $('status'), invoiceNumber: $('invoiceNumber'),
    issueDate: $('issueDate'), dueDate: $('dueDate'), datePaid: $('datePaid'), currency: $('currency'),
    sendTo: $('sendTo'), documentClass: $('documentClass'), issuedBy: $('issuedBy'), recipient: $('recipient'),
    paymentMethod: $('paymentMethod'), reference: $('reference'), purpose: $('purpose'), notes: $('notes'),
    taxRate: $('taxRate'), iban: $('iban'), paymentReference: $('paymentReference'), authorisedBy: $('authorisedBy'),
    authorisedRole: $('authorisedRole')
  };

  const currencySymbol = { EUR: '€', GBP: '£', USD: '$', CHF: 'CHF', BRL: 'R$' };

  function localISO(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function todayISO(){ return localISO(new Date()); }
  function offsetISO(days){ const d = new Date(); d.setDate(d.getDate()+days); return localISO(d); }
  function parseMoney(value){ const n = Number(String(value).replace(/[^0-9.-]/g,'')); return Number.isFinite(n) ? n : 0; }
  function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }
  function money(n){
    const currency = els.currency.value || 'EUR';
    const value = new Intl.NumberFormat('en-US', {minimumFractionDigits:2, maximumFractionDigits:2}).format(round2(n));
    return `${currencySymbol[currency] || currency} ${value}`;
  }
  function dateDisplay(value){ if(!value) return '—'; const [y,m,d] = value.split('-'); return `${d}.${m}.${y}`; }
  function firstLine(text){ return (text || '').split('\n')[0].trim(); }
  function escapeHtml(s){ return String(s ?? '').replace(/[&<>'"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
  function safeTextToHtml(s){ return escapeHtml(s).replace(/\n/g,'<br>'); }

  function initialItems(){
    return [
      {description:'Strategic Consultancy', quantity:1, unitPrice:2500},
      {description:'Market Research Report', quantity:1, unitPrice:1200},
      {description:'Creative Direction (Half Day)', quantity:2, unitPrice:800}
    ];
  }

  function addItem(data={description:'', quantity:1, unitPrice:0}){
    items.push({ description:data.description || '', quantity:Number(data.quantity)||1, unitPrice:Number(data.unitPrice)||0 });
    renderItems();
    updateAll();
  }

  function renderItems(){
    itemContainer.innerHTML = '';
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <input class="description-input" aria-label="Item ${index+1} description" value="${escapeHtml(item.description)}">
        <input class="qty-input" aria-label="Item ${index+1} quantity" type="number" min="0" step="0.01" required value="${item.quantity}">
        <input class="money-input" aria-label="Item ${index+1} unit price" type="number" min="0" step="0.01" required value="${item.unitPrice}">
        <div class="line-total" aria-label="Item ${index+1} total">${money(item.quantity * item.unitPrice)}</div>
        <button class="remove-item" type="button" aria-label="Remove item ${index+1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg></button>`;
      const [desc, qty, price] = row.querySelectorAll('input');
      desc.addEventListener('input', e => { items[index].description = e.target.value; updateAll(); });
      qty.addEventListener('input', e => { items[index].quantity = Math.max(0, Number(e.target.value)||0); updateAll(); });
      price.addEventListener('input', e => { items[index].unitPrice = Math.max(0, parseMoney(e.target.value)); updateAll(); });
      row.querySelector('.remove-item').addEventListener('click', () => {
        if(items.length === 1){ toast('At least one item is required.'); return; }
        items.splice(index,1); renderItems(); updateAll();
      });
      itemContainer.appendChild(row);
    });
  }

  function calculate(){
    const subtotal = round2(items.reduce((sum,item) => sum + round2((Number(item.quantity)||0)*(Number(item.unitPrice)||0)),0));
    const rate = Math.max(0, Number(els.taxRate.value)||0);
    const tax = round2(subtotal * rate / 100);
    return { subtotal, tax, total: round2(subtotal + tax), rate };
  }

  function recipientTerm(){
    const type = els.documentType.value;
    if(['Payment Record','Expense Record'].includes(type)) return 'Paid To / Supplier';
    if(type === 'Purchase Order') return 'Supplier / Recipient';
    return 'Client / Recipient';
  }

  function partyPreviewHeading(){
    return ['Payment Record','Expense Record'].includes(els.documentType.value) ? 'PAID TO' : (els.documentType.value === 'Purchase Order' ? 'SUPPLIER' : 'TO');
  }

  function renderPreviewItems(){
    const tbody = $('previewItems'); tbody.innerHTML = '';
    items.forEach((item,index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${String(index+1).padStart(2,'0')}</td><td>${escapeHtml(item.description || '—')}</td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${money(item.quantity*item.unitPrice)}</td>`;
      tbody.appendChild(tr);
    });
  }

  function updateAll(){
    generated = false;
    const calc = calculate();
    const title = els.documentType.value.toUpperCase();
    $('recipientLabel').firstChild.nodeValue = `${recipientTerm()}\n                `;
    $('previewPartyHeading').textContent = partyPreviewHeading();
    $('previewTitle').textContent = title;
    $('previewTitle').classList.toggle('long-title',title.length > 10);
    $('numberLabel').firstChild.nodeValue = `${els.documentType.value === 'Invoice' ? 'Invoice' : 'Document'} Number\n`;
    $('generateLabel').textContent = `Generate ${els.documentType.value}`;
    $('previewSubtitle').textContent = `${els.documentType.value === 'Invoice' ? 'Invoice / Payment Record' : els.documentType.value} / Consultancy / Professional Services`;
    $('previewStatus').textContent = `[${els.status.value.toUpperCase()}]`;
    $('previewNumber').textContent = els.invoiceNumber.value || '—';
    $('previewIssueDate').textContent = dateDisplay(els.issueDate.value);
    $('previewDueDate').textContent = dateDisplay(els.dueDate.value);
    $('previewCurrency').textContent = els.currency.value;
    renderParty($('previewIssuedBy'), els.issuedBy.value);
    $('previewIssuedBy').classList.add('party-text');
    renderParty($('previewRecipient'), els.recipient.value);
    $('previewRecipient').classList.add('party-text');
    $('previewPurpose').textContent = els.purpose.value || els.reference.value || '—';
    $('previewNotes').textContent = els.notes.value || '—';
    $('previewGrandTotal').textContent = money(calc.total);
    $('previewSubtotal').textContent = money(calc.subtotal);
    $('previewTax').textContent = money(calc.tax);
    $('previewTotal').textContent = money(calc.total);
    $('previewTaxLabel').textContent = `VAT (${calc.rate}%)`;
    $('subtotalForm').textContent = money(calc.subtotal);
    $('taxForm').textContent = money(calc.tax);
    $('totalForm').textContent = money(calc.total);
    $('previewPaymentMethod').textContent = els.paymentMethod.value || '—';
    $('previewPaymentReference').textContent = els.paymentReference.value || els.invoiceNumber.value || '—';
    $('previewIban').textContent = els.iban.value || '—';
    $('previewAuthorisedBy').textContent = els.authorisedBy.value || '—';
    $('previewAuthorisedRole').textContent = els.authorisedRole.value || '';
    $('previewDocumentClass').textContent = `[${els.documentClass.value.toUpperCase()}]`;
    $('paymentReference').placeholder = els.invoiceNumber.value;
    renderPreviewItems();

    [...itemContainer.querySelectorAll('.item-row')].forEach((row,i) => {
      const total = items[i] ? items[i].quantity*items[i].unitPrice : 0;
      const target = row.querySelector('.line-total'); if(target) target.textContent = money(total);
    });

    const isPaid = els.status.value === 'Paid';
    document.querySelector('.paid-date-field').classList.toggle('inactive', !isPaid);
    els.datePaid.disabled = !isPaid;
    els.datePaid.required = isPaid;
    $('paidStamp').hidden = !isPaid;
    $('previewPaidDate').textContent = els.datePaid.value ? `PAID ${dateDisplay(els.datePaid.value)}` : 'PAYMENT RECORDED';
    updateReady();
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(paginatePreview);
    scheduleAutosave();
  }

  function collectData(){
    const data = {};
    Object.keys(els).forEach(key => data[key] = els[key].value);
    data.items = items.map(i => ({...i}));
    data.currentArchiveId = currentArchiveId;
    data.paymentReferenceCustom = els.paymentReference.dataset.userChanged === '1';
    data.updatedAt = new Date().toISOString();
    return data;
  }

  function renderParty(target, value){
    const [name,...lines]=value.split('\n');
    target.innerHTML=`<div class="party-name">${escapeHtml(name)}</div><div class="party-address">${safeTextToHtml(lines.join('\n'))}</div>`;
  }

  function applyData(data){
    if(!data) return;
    Object.keys(els).forEach(key => { if(data[key] !== undefined && data[key] !== null) els[key].value = data[key]; });
    items = Array.isArray(data.items) && data.items.length ? data.items.filter(i => i && typeof i === 'object').map(i=>({description:String(i.description ?? ''),quantity:Number.isFinite(Number(i.quantity)) ? Math.max(0,Number(i.quantity)) : 0,unitPrice:Number.isFinite(Number(i.unitPrice)) ? Math.max(0,Number(i.unitPrice)) : 0})) : initialItems();
    if(!items.length) items=initialItems();
    els.paymentReference.dataset.userChanged = data.paymentReferenceCustom || (data.paymentReference && data.paymentReference !== data.invoiceNumber) ? '1' : '';
    Object.values(els).filter(el=>el.tagName==='SELECT').forEach(el=>{ if(!el.value) el.selectedIndex=0; });
    currentArchiveId = data.id || data.currentArchiveId || null;
    renderItems(); updateAll();
  }

  function saveDraft(){
    clearTimeout(autosaveTimer);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(collectData())); $('autosaveStatus').textContent = 'Saved locally'; }
    catch { $('autosaveStatus').textContent = 'Local saving unavailable — download a PDF to keep this document.'; }
  }
  function scheduleAutosave(){
    clearTimeout(autosaveTimer);
    $('autosaveStatus').textContent = 'Saving…';
    autosaveTimer = setTimeout(saveDraft, 450);
  }

  function updateReady(){
    const invalid = !els.invoiceNumber.value.trim() || !els.issueDate.value || !els.issuedBy.value.trim() || !els.recipient.value.trim() || items.some(i=>!i.description.trim()) || !form.checkValidity() || layoutError;
    const state = invalid || els.status.value === 'Void' ? 'invalid' : generated ? 'ready' : 'draft';
    document.querySelector('.ready-status').dataset.state = state;
    $('readyLabel').textContent = invalid ? 'Check document details' : els.status.value === 'Void' ? 'Void document' : generated ? 'Generated · ready to export' : 'Live draft · not generated';
  }

  function focusInvalid(el){
    setMobileView('edit');
    const details=el.closest('details'); if(details) details.open=true;
    el.focus(); el.reportValidity();
  }

  function validate(){
    const required = [els.invoiceNumber, els.issueDate, els.issuedBy, els.recipient];
    const invalid = required.find(el => !String(el.value).trim());
    if(invalid){ focusInvalid(invalid); toast('Please complete the required document information.'); return false; }
    if(els.sendTo.value && !els.sendTo.checkValidity()){ focusInvalid(els.sendTo); toast('Please enter a valid email address.'); return false; }
    if(!items.length || items.some(i => !i.description.trim())){ toast('Every line item needs a description.'); return false; }
    const invalidControl = [...form.elements].find(el => el.willValidate && !el.checkValidity());
    if(invalidControl){ focusInvalid(invalidControl); toast('Check the highlighted value. Quantities and prices must be non-negative; VAT must be 0–100%.'); return false; }
    if(els.dueDate.value && els.dueDate.value < els.issueDate.value){ focusInvalid(els.dueDate); toast('Due date cannot precede issue date.'); return false; }
    if(els.status.value === 'Paid' && (!els.datePaid.value || els.datePaid.value < els.issueDate.value)){ focusInvalid(els.datePaid); toast('Date Paid is required and cannot precede issue date.'); return false; }
    if(!Number.isFinite(calculate().total) || calculate().total > 999999999.99){ toast('Document total must not exceed 999,999,999.99.'); return false; }
    paginatePreview();
    if(layoutError){ toast('A text block or line item is too long for A4. Shorten it before exporting.'); return false; }
    return true;
  }

  function generate(){
    if(!validate()) return false;
    updateAll();
    generated = true; updateReady();
    saveDraft();
    toast(`${els.documentType.value} generated — ready to send or archive.`);
    if(window.innerWidth < 1000) setMobileView('preview');
    return true;
  }

  async function downloadPdf(silent=false){
    if(!generate()) return false;
    if(typeof html2pdf === 'undefined'){
      toast('PDF engine did not load. Use Print → Save as PDF.');
      return false;
    }
    if(exporting) return false;
    exporting = true;
    document.querySelector('.app-shell').inert=true;
    const buttons=[$('downloadButton'),$('sendButton'),$('printButton')];
    buttons.forEach(b=>b.disabled=true);
    const filename = `${(els.invoiceNumber.value || 'Moscatelli-Document').replace(/[^a-z0-9-_]/gi,'_')}.pdf`;
    const host=document.createElement('div'); host.className='export-host';
    toast('Preparing PDF…');
    try {
      await document.fonts.ready;
      paginatePreview();
      const pages=[...$('documentPages').children].map(page=>{ const copy=page.cloneNode(true); copy.style.zoom='1'; return copy; });
      document.body.appendChild(host);
      let pdf;
      for(const page of pages){
        host.replaceChildren(page);
        // Render an unscaled, scroll-independent page. html2pdf's default container is
        // wider than the live sheet and its automatic slicing clips scaled previews.
        const worker=html2pdf().set({margin:0,image:{type:'jpeg',quality:0.98},html2canvas:{scale:2.5,width:625,height:884,scrollX:0,scrollY:0,windowWidth:1448,windowHeight:1086,backgroundColor:'#ffffff',logging:false},jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},pagebreak:{mode:[]}}).from(page).toContainer();
        const container=await worker.get('container');
        Object.assign(container.style,{left:'0',right:'auto',top:'0',margin:'0',width:'625px'});
        await worker.toCanvas();
        const canvas=await worker.get('canvas');
        if(!pdf){
          // Reuse the engine's jsPDF instance, but explicitly place each complete A4 page.
          pdf=await worker.toPdf().get('pdf');
          for(let n=pdf.internal.getNumberOfPages();n>=1;n--) pdf.deletePage(n);
        }
        pdf.addPage('a4','portrait');
        pdf.addImage(canvas.toDataURL('image/jpeg',0.98),'JPEG',0,0,210,297);
      }
      pdf.save(filename);
      if(!silent) toast('PDF downloaded.');
      return true;
    } catch(err){ console.error(err); toast('PDF export failed. Use Print → Save as PDF.'); return false; }
    finally { host.remove(); exporting=false; document.querySelector('.app-shell').inert=false; buttons.forEach(b=>b.disabled=false); }
  }

  async function sendEmail(){
    if(!validate()) return;
    if(!els.sendTo.value){ focusInvalid(els.sendTo); toast('Add a Send To email address first.'); return; }
    if(!await downloadPdf(true)) return;
    const calc = calculate();
    const subject = encodeURIComponent(`${els.documentType.value} ${els.invoiceNumber.value} — Moscatelli`);
    const body = encodeURIComponent(`Dear Sir/Madam,\n\nPlease find attached ${els.documentType.value.toLowerCase()} ${els.invoiceNumber.value}, with a document value of ${money(calc.total)}.\n\nKind regards,\nMoscatelli\n\nNote: your browser cannot attach the downloaded PDF automatically. Please attach it to this email before sending.`);
    window.location.href = `mailto:${encodeURIComponent(els.sendTo.value)}?subject=${subject}&body=${body}`;
    toast('PDF downloaded; your mail application is opening. Attach the PDF before sending.');
  }

  function getArchive(){ try { const data=JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); if(!Array.isArray(data)) throw new Error('Invalid archive'); return data.filter(d=>d && typeof d==='object' && typeof d.id==='string'); } catch { toast('Local archive cannot be read. Existing storage has been preserved.'); return null; } }
  function setArchive(arr){ try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(arr)); return true; } catch { toast('Archive could not be saved. Download a PDF to keep this document.'); return false; } }
  function archiveCurrent(){
    if(!generate()) return;
    const archive = getArchive();
    if(!archive) return;
    const data = collectData();
    const calc = calculate();
    const id = currentArchiveId || `doc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    data.id = id; data.currentArchiveId = id; data.archivedAt = new Date().toISOString(); data.total = calc.total;
    const existing = archive.findIndex(d => d.id === id);
    if(existing >= 0) archive[existing] = data; else archive.unshift(data);
    if(!setArchive(archive)) return;
    currentArchiveId = id; scheduleAutosave();
    toast(existing >= 0 ? 'Archived document updated.' : 'Document saved to archive.');
  }

  function renderArchive(){
    const archive = getArchive();
    if(!archive) return;
    const body = $('archiveTableBody'); body.innerHTML = '';
    $('archiveEmpty').style.display = archive.length ? 'none' : 'block';
    archive.forEach(doc => {
      const tr = document.createElement('tr');
      const recipient = firstLine(doc.recipient);
      let value = doc.total || 0;
      try {
        const formatted = new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
        value = `${currencySymbol[doc.currency] || doc.currency || '€'} ${formatted}`;
      } catch {}
      tr.innerHTML = `<td>${escapeHtml(doc.invoiceNumber || '—')}</td><td>${escapeHtml(doc.documentType || '—')}</td><td>${escapeHtml(recipient || '—')}</td><td>${escapeHtml(dateDisplay(doc.status === 'Paid' ? doc.datePaid || doc.issueDate : doc.issueDate))}</td><td>${escapeHtml(value)}</td><td>${escapeHtml(doc.status || '—')}</td><td><button data-open="${escapeHtml(doc.id)}">Open</button><button data-delete="${escapeHtml(doc.id)}" aria-label="Delete">Delete</button></td>`;
      body.appendChild(tr);
    });
    body.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click',()=>{
      const doc = archive.find(d => d.id === btn.dataset.open); if(doc){ applyData(doc); showGenerator(); toast('Archived document reopened.'); }
    }));
    body.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click',()=>{
      if(!confirm('Delete this locally archived document?')) return;
      const latest=getArchive();
      if(!latest || !setArchive(latest.filter(d=>d.id !== btn.dataset.delete))) return;
      if(currentArchiveId === btn.dataset.delete){ currentArchiveId=null; saveDraft(); }
      renderArchive(); toast('Archived document deleted.');
    }));
  }

  function showArchive(){ $('editorPanel').classList.add('hidden'); $('previewPanel').classList.add('hidden'); $('archiveView').classList.remove('hidden'); $('placeholderView').classList.add('hidden'); renderArchive(); }
  function showGenerator(){ setMobileView('edit'); $('editorPanel').classList.remove('hidden'); $('previewPanel').classList.remove('hidden'); $('archiveView').classList.add('hidden'); $('placeholderView').classList.add('hidden'); updateAll(); }
  function showPlaceholder(title,text){ $('editorPanel').classList.add('hidden'); $('previewPanel').classList.add('hidden'); $('archiveView').classList.add('hidden'); $('placeholderView').classList.remove('hidden'); $('placeholderTitle').textContent=title; $('placeholderText').textContent=text; }

  function switchNav(view){
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
    if(view==='invoice'){ els.documentType.value='Invoice'; showGenerator(); }
    else if(view==='payment'){ els.documentType.value='Payment Record'; els.status.value='Paid'; if(!els.datePaid.value) els.datePaid.value=todayISO(); showGenerator(); }
    else if(view==='archive') showArchive();
    else if(view==='dashboard') showPlaceholder('DASHBOARD','A restrained overview of issued documents, payments and financial activity will live here.');
    else if(view==='clients') showPlaceholder('CLIENTS','Client profiles and reusable billing details are prepared for the next development phase.');
    else if(view==='products') showPlaceholder('PRODUCTS & SERVICES','Reusable Moscatelli services and item presets are prepared for the next development phase.');
    updateAll();
  }

  function fitPreview(){
    const panel=$('previewPanel');
    if(!panel.clientWidth) return;
    const style=getComputedStyle(panel);
    const available=panel.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
    const scale=Math.min(1,available/625);
    $('documentPages').querySelectorAll('.invoice-sheet').forEach(page=>page.style.zoom=String(scale));
  }

  function paginatePreview(){
    cancelAnimationFrame(layoutFrame);
    const source=$('invoiceSheet');
    const pages=[];
    const host=document.createElement('div'); host.className='document-source';
    host.style.visibility='hidden'; document.body.appendChild(host);
    layoutError=false;
    const copy=(node)=>{ const el=node.cloneNode(true); el.removeAttribute('id'); el.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id')); return el; };
    let page,footer;
    function newPage(continuation=false){
      page=document.createElement('article'); page.className='invoice-sheet';
      page.style.height='883.921875px'; page.style.overflow='hidden';
      host.appendChild(page); pages.push(page);
      footer=copy(source.querySelector('.doc-footer')); page.appendChild(footer);
      if(continuation){
        page.insertBefore(copy(source.querySelector('.doc-top')),footer);
        page.insertBefore(copy(source.querySelector('.oxblood-rule')),footer);
        const label=document.createElement('p'); label.className='continuation-label'; label.textContent=`${els.documentType.value.toUpperCase()} · ${els.invoiceNumber.value} · CONTINUED`;
        page.insertBefore(label,footer);
      }
    }
    const fits=()=>footer.offsetTop+footer.offsetHeight <= page.clientHeight-35+1;
    newPage();
    [...source.children].filter(el=>!el.matches('.doc-footer') && !el.hidden).forEach(block=>{
      if(block.matches('.doc-items')){
        let table=copy(block); const rows=[...table.tBodies[0].rows]; table.tBodies[0].replaceChildren(); page.insertBefore(table,footer);
        rows.forEach(row=>{
          table.tBodies[0].appendChild(row);
          if(!fits()){
            row.remove(); if(!table.tBodies[0].rows.length) table.remove();
            newPage(true); table=copy(block); table.tBodies[0].replaceChildren(row); page.insertBefore(table,footer);
            if(!fits()) layoutError=true;
          }
        });
      } else {
        const el=copy(block); page.insertBefore(el,footer);
        if(!fits()) { el.remove(); newPage(true); page.insertBefore(el,footer); if(!fits()) layoutError=true; }
      }
    });
    pages.forEach((page,index)=>{ page.querySelector('.doc-footer>div:last-child').textContent=`PAGE ${index+1} / ${pages.length}`; page.setAttribute('aria-label',`Document page ${index+1} of ${pages.length}`); });
    $('documentPages').replaceChildren(...pages);
    host.remove(); fitPreview(); updateReady();
  }

  function setMobileView(view){
    const preview = view==='preview'; workspace.classList.toggle('mobile-preview', preview);
    document.querySelectorAll('[data-mobile-view]').forEach(b=>b.classList.toggle('active',b.dataset.mobileView===view));
    if(preview) setTimeout(fitPreview, 0);
  }

  function duplicateDocument(){
    currentArchiveId=null;
    const base = els.invoiceNumber.value.replace(/(\d+)$/, (m)=> String(Number(m)+1).padStart(m.length,'0'));
    const candidate = base===els.invoiceNumber.value ? `${els.invoiceNumber.value}-COPY` : base;
    const used=new Set((getArchive() || []).map(doc=>doc.invoiceNumber));
    let next=candidate, suffix=2;
    while(used.has(next)) next=`${candidate}-${suffix++}`;
    els.invoiceNumber.value = next;
    els.paymentReference.value = els.invoiceNumber.value;
    els.paymentReference.dataset.userChanged='';
    els.status.value='Draft'; els.datePaid.value='';
    updateAll(); toast('Document duplicated as a new draft.');
  }

  function resetDocument(){
    if(!confirm('Reset the generator and clear the current local draft?')) return;
    currentArchiveId=null; els.paymentReference.dataset.userChanged='';
    els.documentType.value='Invoice'; els.status.value='Issued'; els.invoiceNumber.value=`MOS-${new Date().getFullYear()}-0017`;
    els.issueDate.value=todayISO(); els.dueDate.value=offsetISO(30); els.datePaid.value=''; els.currency.value='EUR';
    els.sendTo.value=''; els.documentClass.value='External';
    els.issuedBy.value='Moscatelli\nVia dei Condotti 12\n00187 Roma, Italy\nVAT IT123456789\nfinance@moscatelli.com';
    els.recipient.value=''; els.paymentMethod.value='Bank Transfer'; els.reference.value=''; els.purpose.value=''; els.notes.value=''; els.taxRate.value='22';
    els.iban.value=''; els.paymentReference.value=els.invoiceNumber.value; els.authorisedBy.value=''; els.authorisedRole.value=''; items=[{description:'',quantity:1,unitPrice:0}];
    renderItems(); updateAll(); toast('Generator reset.');
  }

  let toastTimeout;
  function toast(message){ const t=$('toast'); t.textContent=message; t.classList.add('show'); clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>t.classList.remove('show'),2800); }

  function bind(){
    form.addEventListener('submit', e=>{e.preventDefault();generate();});
    Object.values(els).forEach(el=>{ el.addEventListener('input',updateAll); el.addEventListener('change',updateAll); });
    els.invoiceNumber.addEventListener('input',()=>{ if(!els.paymentReference.dataset.userChanged) els.paymentReference.value=els.invoiceNumber.value; updateAll(); });
    els.paymentReference.addEventListener('input',()=>els.paymentReference.dataset.userChanged='1');
    els.status.addEventListener('change',()=>{ if(els.status.value==='Paid'){ if(!els.datePaid.value) els.datePaid.value=todayISO(); els.datePaid.closest('details').open=true; } updateAll(); });
    $('openArchiveButton').addEventListener('click',()=>switchNav('archive'));
    $('addItem').addEventListener('click',()=>addItem());
    $('downloadButton').addEventListener('click',()=>downloadPdf());
    $('printButton').addEventListener('click',()=>{ if(generate()) window.print(); });
    $('sendButton').addEventListener('click',sendEmail);
    $('previewButton').addEventListener('click',()=>{setMobileView('preview'); $('previewPanel').scrollIntoView({behavior:'smooth',block:'start'});});
    $('archiveButton').addEventListener('click',archiveCurrent);
    $('duplicateButton').addEventListener('click',duplicateDocument);
    $('resetButton').addEventListener('click',resetDocument);
    $('moreButton').addEventListener('click',()=>{ const m=$('moreMenu'); m.classList.toggle('open'); $('moreButton').setAttribute('aria-expanded',m.classList.contains('open')); });
    document.addEventListener('click',e=>{ if(!e.target.closest('.secondary-actions') || e.target.closest('.more-menu button')){ $('moreMenu').classList.remove('open'); $('moreButton').setAttribute('aria-expanded','false'); } });
    document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>switchNav(btn.dataset.view)));
    $('backToGenerator').addEventListener('click',showGenerator);
    $('placeholderReturn').addEventListener('click',()=>switchNav('invoice'));
    document.querySelectorAll('[data-mobile-view]').forEach(btn=>btn.addEventListener('click',()=>setMobileView(btn.dataset.mobileView)));
    $('searchButton').addEventListener('click',()=>switchNav('archive'));
    $('searchButton').setAttribute('aria-label','Open document archive');
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){ $('moreMenu').classList.remove('open'); $('moreButton').setAttribute('aria-expanded','false'); }});
    window.addEventListener('pagehide',saveDraft);
    document.addEventListener('visibilitychange',()=>{if(document.hidden) saveDraft();});
    window.addEventListener('beforeprint',paginatePreview);
    window.addEventListener('resize', fitPreview);
  }

  function init(){
    els.issueDate.value=todayISO(); els.dueDate.value=offsetISO(30);
    items=initialItems();
    let draft; try { draft = localStorage.getItem(DRAFT_KEY); } catch { /* Work in memory when browser storage is unavailable. */ }
    if(draft){ try{ applyData(JSON.parse(draft)); }catch{ renderItems(); } }
    else { renderItems(); els.paymentReference.value=els.invoiceNumber.value; updateAll(); }
    bind(); updateAll(); paginatePreview();
    document.fonts.ready.then(paginatePreview);
  }

  init();
})();
