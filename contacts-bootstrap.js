(() => {
  'use strict';

  const CONTACTS_KEY='moscatelli_invoice_contacts_v1';
  const OLD_ISSUER='Moscatelli\nVia dei Condotti 12\n00187 Roma, Italy\nVAT IT123456789\nfinance@moscatelli.com';
  const DEFAULT_ISSUER=Object.freeze({
    name:'Moscatelli',
    taxId:'',
    address:'Via delle Monachelle 16 - B3\n00066 Manziana, Roma, Italia',
    email:'finance@moscatelli.co'
  });
  const SEEDED_CONTACTS=Object.freeze([
    Object.freeze({id:'ufficio-firenze',name:'Ufficio Firenze',taxId:'CNPJ 36.470.878/0001-38',address:'Rua Abraão Delega, 312\nJardim Ocara, Santo André - SP\nCEP 09051-080',email:'sergio10cricca@hotmail.com'}),
    Object.freeze({id:'marcella-silva-benedito',name:'Marcella Silva Benedito',taxId:'CPF 428.333.878-81',address:'Rua Antônio Pereira de Souza, 448, apto 5\nSanta Teresinha, São Paulo - SP\nCEP 02404-060',email:'marcellasb79@gmail.com'}),
    Object.freeze({id:'gabriela-fuzaro',name:'Gabriela Fuzaro',taxId:'CPF 456.197.928-03',address:'Rua Agenor Mantovani, 45\nVila Renato (Pirituba), São Paulo - SP\nCEP 02952-080',email:'gabrielafuzaro@gmail.com'})
  ]);

  let contactsCache=SEEDED_CONTACTS.map(contact=>({...contact}));
  let editingId=null;
  let pickerTarget='recipient';
  let allowNativeDownload=false;
  let incrementAfterSave=false;
  let incrementExpiry=null;

  const $=id=>document.getElementById(id);
  const escapeHtml=value=>String(value ?? '').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const safeBreaks=value=>escapeHtml(value).replace(/\n/g,'<br>');
  const cloneContacts=list=>list.map(contact=>({...contact}));
  const contactBlock=contact=>[contact?.name,contact?.taxId,contact?.address,contact?.email].filter(value=>String(value||'').trim()).join('\n');
  const dispatchField=element=>{element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));};

  function normaliseContact(contact){
    return {
      id:String(contact?.id || `contact_${Date.now()}_${Math.random().toString(36).slice(2,7)}`).slice(0,120),
      name:String(contact?.name || '').trim().slice(0,160),
      taxId:String(contact?.taxId || '').trim().slice(0,80),
      address:String(contact?.address || '').trim().slice(0,600),
      email:String(contact?.email || '').trim().slice(0,254)
    };
  }

  function getContacts(){
    try{
      const raw=localStorage.getItem(CONTACTS_KEY);
      if(!raw){localStorage.setItem(CONTACTS_KEY,JSON.stringify(contactsCache));return cloneContacts(contactsCache);}
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed))throw new Error('Invalid contact store');
      contactsCache=parsed.map(normaliseContact).filter(contact=>contact.name&&contact.address&&contact.email);
      return cloneContacts(contactsCache);
    }catch{return cloneContacts(contactsCache);}
  }

  function setContacts(list){
    contactsCache=list.map(normaliseContact).filter(contact=>contact.name&&contact.address&&contact.email);
    try{localStorage.setItem(CONTACTS_KEY,JSON.stringify(contactsCache));return true;}
    catch{showToast('Contacts could not be saved in this browser.');return false;}
  }

  function showToast(message){
    const toast=$('toast');if(!toast)return;
    toast.textContent=message;toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),2800);
  }

  function openModal(id){const modal=$(id);if(!modal)return;modal.hidden=false;document.body.classList.add('contacts-modal-open');setTimeout(()=>modal.querySelector('input,textarea,button')?.focus(),0);}
  function closeModal(id){const modal=$(id);if(modal)modal.hidden=true;if(!document.querySelector('.contacts-modal:not([hidden])'))document.body.classList.remove('contacts-modal-open');}
  function closeModals(){document.querySelectorAll('.contacts-modal').forEach(modal=>modal.hidden=true);document.body.classList.remove('contacts-modal-open');}

  function migrateIssuer(){
    const issuedBy=$('issuedBy');if(!issuedBy)return;
    if(issuedBy.value.trim()===OLD_ISSUER.trim()){
      issuedBy.value=contactBlock(DEFAULT_ISSUER);dispatchField(issuedBy);
    }
  }

  function applyContact(contact,target=pickerTarget){
    if(target==='issuer'){
      const issuedBy=$('issuedBy');issuedBy.value=contactBlock(contact);dispatchField(issuedBy);
      showToast('Issued by contact updated.');
    }else{
      const recipient=$('recipient');recipient.value=contactBlock(contact);dispatchField(recipient);
      const sendTo=$('sendTo');if(sendTo){sendTo.value=contact.email||'';dispatchField(sendTo);}
      showToast(`${contact.name} added to the document.`);
    }
    closeModal('moscatelliContactPicker');
  }

  function compactContact(contact,isDefault=false){
    return `<strong>${escapeHtml(contact.name)}</strong>${contact.taxId?`<span>${escapeHtml(contact.taxId)}</span>`:''}<small>${escapeHtml(contact.email)}</small>${isDefault?'<em>Default issuer</em>':''}`;
  }

  function renderPicker(){
    const list=$('moscatelliPickerList');if(!list)return;list.innerHTML='';
    $('moscatelliPickerTitle').textContent=pickerTarget==='issuer'?'Send from a different contact':'Choose a saved contact';
    $('moscatelliPickerHint').textContent=pickerTarget==='issuer'?'Choose who should appear in the Issued By block.':'The selected contact will populate the party and Send To email fields.';
    if(pickerTarget==='issuer'){
      const button=document.createElement('button');button.type='button';button.className='mos-contact-pick is-default';button.innerHTML=compactContact(DEFAULT_ISSUER,true);button.addEventListener('click',()=>applyContact(DEFAULT_ISSUER,'issuer'));list.appendChild(button);
    }
    getContacts().forEach(contact=>{
      const button=document.createElement('button');button.type='button';button.className='mos-contact-pick';button.innerHTML=compactContact(contact);button.addEventListener('click',()=>applyContact(contact,pickerTarget));list.appendChild(button);
    });
    if(!list.children.length){const empty=document.createElement('p');empty.className='mos-picker-empty';empty.textContent='No saved contacts yet.';list.appendChild(empty);}
  }

  function openPicker(target){pickerTarget=target==='issuer'?'issuer':'recipient';renderPicker();openModal('moscatelliContactPicker');}

  function contactCard(contact){
    return `<div class="mos-contact-title"><strong>${escapeHtml(contact.name)}</strong>${contact.taxId?`<span>${escapeHtml(contact.taxId)}</span>`:''}</div><p>${safeBreaks(contact.address)}</p><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a><div class="mos-contact-actions"><button type="button" data-use-recipient>Use as recipient</button><button type="button" data-use-issuer>Use as issuer</button><button type="button" data-edit>Edit</button><button type="button" data-delete>Delete</button></div>`;
  }

  function renderContacts(){
    const grid=$('moscatelliContactsGrid');if(!grid)return;
    const contacts=getContacts();grid.innerHTML='';$('moscatelliContactsEmpty').hidden=contacts.length>0;
    contacts.forEach(contact=>{
      const card=document.createElement('article');card.className='mos-contact-card';card.innerHTML=contactCard(contact);
      card.querySelector('[data-use-recipient]').addEventListener('click',()=>{applyContact(contact,'recipient');returnToGenerator();});
      card.querySelector('[data-use-issuer]').addEventListener('click',()=>{applyContact(contact,'issuer');returnToGenerator();});
      card.querySelector('[data-edit]').addEventListener('click',()=>openEditor(contact));
      card.querySelector('[data-delete]').addEventListener('click',()=>{if(!confirm(`Delete ${contact.name} from saved contacts?`))return;const latest=getContacts().filter(item=>item.id!==contact.id);if(setContacts(latest)){renderContacts();showToast('Contact deleted.');}});
      grid.appendChild(card);
    });
  }

  function openEditor(contact=null){
    editingId=contact?.id||null;
    $('moscatelliContactEditorTitle').textContent=contact?'Edit contact':'Add contact';
    $('mosContactName').value=contact?.name||'';$('mosContactTax').value=contact?.taxId||'';$('mosContactAddress').value=contact?.address||'';$('mosContactEmail').value=contact?.email||'';
    openModal('moscatelliContactEditor');
  }

  function saveEditor(event){
    event.preventDefault();const form=event.currentTarget;if(!form.checkValidity()){form.reportValidity();return;}
    const contact=normaliseContact({id:editingId||undefined,name:$('mosContactName').value,taxId:$('mosContactTax').value,address:$('mosContactAddress').value,email:$('mosContactEmail').value});
    const contacts=getContacts();const index=contacts.findIndex(item=>item.id===editingId);if(index>=0)contacts[index]=contact;else contacts.unshift(contact);
    if(!setContacts(contacts))return;closeModal('moscatelliContactEditor');renderContacts();renderPicker();showToast(index>=0?'Contact updated.':'Contact saved.');
  }

  function showContacts(){
    $('editorPanel')?.classList.add('hidden');$('previewPanel')?.classList.add('hidden');$('archiveView')?.classList.add('hidden');$('placeholderView')?.classList.add('hidden');
    $('moscatelliContactsView')?.classList.remove('hidden');document.body.classList.add('contacts-view-open');
    document.querySelectorAll('.nav-item').forEach(button=>button.classList.toggle('active',button.id==='moscatelliContactsNav'));
    renderContacts();
  }

  function hideContacts(){
    $('moscatelliContactsView')?.classList.add('hidden');document.body.classList.remove('contacts-view-open');
  }

  function returnToGenerator(){
    hideContacts();const payment=$('documentType')?.value==='Payment Record';const nav=document.querySelector(`.nav-item[data-view="${payment?'payment':'invoice'}"]`);nav?.click();
  }

  function openDownloadChoice(){
    incrementAfterSave=false;clearTimeout(incrementExpiry);
    $('mosDownloadReference').textContent=$('invoiceNumber')?.value||'—';openModal('moscatelliDownloadChoice');
  }

  function triggerNativeDownload(increment){
    incrementAfterSave=!!increment;clearTimeout(incrementExpiry);if(incrementAfterSave)incrementExpiry=setTimeout(()=>{incrementAfterSave=false;},60000);
    closeModal('moscatelliDownloadChoice');allowNativeDownload=true;$('downloadButton')?.click();
  }

  function patchPdfSave(){
    const original=window.jspdf?.jsPDF;if(!original||original.__moscatelliPatched)return;
    const proxied=new Proxy(original,{construct(target,args,newTarget){
      const instance=Reflect.construct(target,args,newTarget===proxied?target:newTarget);const save=instance.save?.bind(instance);
      if(save)instance.save=(...saveArgs)=>{
        const result=save(...saveArgs);
        if(incrementAfterSave){incrementAfterSave=false;clearTimeout(incrementExpiry);queueMicrotask(()=>{
          const before=$('invoiceNumber')?.value;$('duplicateButton')?.click();const after=$('invoiceNumber')?.value;
          if(after&&after!==before){const toast=$('toast');if(toast){toast.textContent=`Downloaded. Next invoice number: ${after}.`;toast.classList.add('show');}}
        });}
        return result;
      };
      return instance;
    }});
    Object.defineProperty(proxied,'__moscatelliPatched',{value:true});window.jspdf.jsPDF=proxied;
  }

  function installEmailLanguageProxy(){
    let stored;
    const brazilian={
      locale:'pt-BR',
      types:['Fatura','Registro de pagamento','Orçamento','Fatura proforma','Registro de despesa','Ordem de compra','Pedido de adiantamento'],
      prepare:'Preparar e-mail',preparing:'Preparando a fatura…',creating:'Criando rascunho no Gmail…',open:'Abrir rascunho no Gmail',download:'Baixar PDF',drafts:'Abrir rascunhos do Gmail',close:'Fechar',connect:'Conectar Gmail',disconnect:'Desconectar Gmail',connected:'Gmail Finance conectado nesta sessão.',help:'Prepare um rascunho no Gmail para revisão. Nenhum e-mail é enviado automaticamente.',fallback:'Sua fatura foi baixada. Anexe-a ao rascunho no Gmail e confirme que Finance Department está selecionado como remetente.',success:'Rascunho criado no Gmail com o PDF anexado e Finance Department como remetente. Revise-o antes de enviar.',blocked:'Se o Gmail não abriu, use o link abaixo.',uncertain:'O Gmail pode ter salvo este rascunho. Verifique os rascunhos antes de preparar outro e-mail.',failed:'Não foi possível concluir o rascunho. O PDF está disponível abaixo. Você pode preparar o e-mail manualmente no Gmail.',wrongAccount:'Entre com gianmoska@gmail.com para criar um rascunho Finance.',alias:'O remetente Finance verificado não foi encontrado. Verifique as configurações de Enviar e-mail como no Gmail.',auth:'A autorização do Gmail não foi concluída. Conecte o Gmail ou prepare o e-mail manualmente.',pdf:'Não foi possível gerar o PDF. Tente Baixar ou Imprimir / Salvar como PDF.',invalid:'Verifique o destinatário, número do documento, moeda e datas.',tooLarge:'O PDF excede o limite de 10 MB. Baixe-o e anexe-o manualmente.',notDue:'Não informada',greeting:name=>`Prezado(a) ${name},`,body:(type,no,total,due)=>`Segue em anexo o documento ${type.toLowerCase()} ${no} da MOSCATELLI.\n\nValor total: ${total}\nData de vencimento: ${due}\n\nCaso precise de informações adicionais, permanecemos à disposição.\n\nAtenciosamente,`,fallbackName:'Senhor(a)',labels:['REFERÊNCIA','DATA DE EMISSÃO','VENCIMENTO','MOEDA','EMITIDO POR','PARA','PAGO A','FORNECEDOR','DESCRIÇÃO','QTD.','UNITÁRIO','VALOR','NOTA','SUBTOTAL','IVA','TOTAL','MÉTODO DE PAGAMENTO','REFERÊNCIA DE PAGAMENTO','IBAN / CONTA','AUTORIZADO POR','CLASSE DO DOCUMENTO','VALOR DO DOCUMENTO','PÁGINA','CONTINUAÇÃO'],statuses:['RASCUNHO','EMITIDO','PAGO','ANULADO'],classes:['EXTERNO','INTERNO','CONFIDENCIAL'],services:'Consultoria / Serviços profissionais'
    };
    const wrap=api=>Object.freeze({...api,lang:value=>value==='pt'?brazilian:api.lang(value)});
    try{Object.defineProperty(window,'MoscatelliEmail',{configurable:true,get(){return stored;},set(value){stored=wrap(value);}});}catch{/* email.js can still load normally */}
  }

  function buildInterface(){
    const clientsNav=document.querySelector('.nav-item[data-view="clients"]');
    if(clientsNav){clientsNav.id='moscatelliContactsNav';clientsNav.setAttribute('aria-label','Contacts');const label=clientsNav.querySelector('span:last-child');if(label)label.textContent='Contacts';
      clientsNav.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();showContacts();},true);
    }
    document.querySelectorAll('.nav-item').forEach(button=>{if(button!==clientsNav)button.addEventListener('click',hideContacts,true);});
    $('searchButton')?.addEventListener('click',hideContacts,true);

    const issuedBy=$('issuedBy');if(issuedBy){if(issuedBy.value.trim()===OLD_ISSUER.trim())issuedBy.value=contactBlock(DEFAULT_ISSUER);const action=document.createElement('button');action.type='button';action.id='mosChangeIssuer';action.className='mos-contact-text-action';action.textContent='Send from a different contact';action.addEventListener('click',()=>openPicker('issuer'));issuedBy.insertAdjacentElement('afterend',action);}
    const recipient=$('recipient');if(recipient){const action=document.createElement('button');action.type='button';action.id='mosPickRecipient';action.className='mos-contact-plus-action';action.setAttribute('aria-label','Choose a saved contact');action.innerHTML='<span>＋</span><em>Saved contact</em>';action.addEventListener('click',()=>openPicker('recipient'));recipient.insertAdjacentElement('afterend',action);}
    const ptOption=$('language')?.querySelector('option[value="pt"]');if(ptOption)ptOption.textContent='Português (Brasil)';

    const workspace=$('workspace');if(workspace)workspace.insertAdjacentHTML('beforeend',`<section class="mos-contacts-view hidden" id="moscatelliContactsView"><div class="mos-contacts-header"><div><span>ADDRESS BOOK</span><h1>CONTACTS</h1><p>Reusable billing and supplier details, stored privately in this browser.</p></div><div class="mos-contacts-head-actions"><button type="button" id="mosAddContact">＋ Add Contact</button><button type="button" id="mosContactsReturn">← Return to Generator</button></div></div><div class="mos-contacts-grid" id="moscatelliContactsGrid"></div><div class="mos-contacts-empty" id="moscatelliContactsEmpty" hidden>No saved contacts yet.</div></section>`);

    document.body.insertAdjacentHTML('beforeend',`
      <div class="contacts-modal" id="moscatelliContactPicker" hidden><section class="mos-dialog mos-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="moscatelliPickerTitle"><button class="mos-modal-close" type="button" data-close="moscatelliContactPicker" aria-label="Close">×</button><span class="mos-dialog-eyebrow">SAVED CONTACTS</span><h2 id="moscatelliPickerTitle">Choose a saved contact</h2><p id="moscatelliPickerHint"></p><div class="mos-contact-picker-list" id="moscatelliPickerList"></div><button class="mos-dialog-link" type="button" id="mosManageContacts">Manage contacts</button></section></div>
      <div class="contacts-modal" id="moscatelliContactEditor" hidden><section class="mos-dialog" role="dialog" aria-modal="true" aria-labelledby="moscatelliContactEditorTitle"><button class="mos-modal-close" type="button" data-close="moscatelliContactEditor" aria-label="Close">×</button><span class="mos-dialog-eyebrow">ADDRESS BOOK</span><h2 id="moscatelliContactEditorTitle">Add contact</h2><form id="mosContactForm"><label>Name / Company<input id="mosContactName" maxlength="160" required></label><label>CPF / CNPJ / Tax ID<input id="mosContactTax" maxlength="80" placeholder="Optional"></label><label>Address<textarea id="mosContactAddress" rows="4" maxlength="600" required></textarea></label><label>Email<input id="mosContactEmail" type="email" maxlength="254" required></label><div class="mos-dialog-actions"><button type="button" class="mos-secondary" data-close="moscatelliContactEditor">Cancel</button><button type="submit" class="mos-primary">Save Contact</button></div></form></section></div>
      <div class="contacts-modal" id="moscatelliDownloadChoice" hidden><section class="mos-dialog mos-download-dialog" role="dialog" aria-modal="true" aria-labelledby="mosDownloadTitle"><button class="mos-modal-close" type="button" data-close="moscatelliDownloadChoice" aria-label="Close">×</button><span class="mos-dialog-eyebrow">DOWNLOAD</span><h2 id="mosDownloadTitle">Increase the invoice number afterwards?</h2><p>The PDF will use <strong id="mosDownloadReference">—</strong>. Choose whether the generator should then move to the next number.</p><div class="mos-download-actions"><button type="button" class="mos-secondary" id="mosDownloadOnly">Download only</button><button type="button" class="mos-primary" id="mosDownloadIncrement">Download + increase by 1</button></div></section></div>`);

    $('mosAddContact')?.addEventListener('click',()=>openEditor());$('mosContactsReturn')?.addEventListener('click',returnToGenerator);$('mosContactForm')?.addEventListener('submit',saveEditor);
    $('mosManageContacts')?.addEventListener('click',()=>{closeModal('moscatelliContactPicker');showContacts();});
    document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.dataset.close)));
    document.querySelectorAll('.contacts-modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal)closeModal(modal.id);}));
    $('mosDownloadOnly')?.addEventListener('click',()=>triggerNativeDownload(false));$('mosDownloadIncrement')?.addEventListener('click',()=>triggerNativeDownload(true));
    const download=$('downloadButton');download?.addEventListener('click',event=>{if(allowNativeDownload){allowNativeDownload=false;return;}event.preventDefault();event.stopImmediatePropagation();openDownloadChoice();},true);
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModals();});
  }

  installEmailLanguageProxy();
  patchPdfSave();
  buildInterface();
  getContacts();

  window.addEventListener('DOMContentLoaded',()=>{
    migrateIssuer();
    $('resetButton')?.addEventListener('click',()=>setTimeout(migrateIssuer,0));
  });
})();
