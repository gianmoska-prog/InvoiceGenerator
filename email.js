(() => {
  'use strict';
  const ACCOUNT='gianmoska@gmail.com';
  const FROM='finance@moscatelli.co';
  const SCOPES=['https://www.googleapis.com/auth/gmail.compose','https://www.googleapis.com/auth/gmail.settings.basic'];
  const MAX_PDF=10*1024*1024;
  const TYPES=['Invoice','Payment Record','Quotation','Pro-forma Invoice','Expense Record','Purchase Order','Deposit Request'];
  const languages={
    en:{locale:'en-GB',types:TYPES,prepare:'Prepare email',preparing:'Preparing invoice…',creating:'Creating Gmail draft…',open:'Open Gmail draft',download:'Download invoice PDF',drafts:'Open Gmail Drafts',close:'Close',connect:'Connect Gmail',disconnect:'Disconnect Gmail',connected:'Finance Gmail connected for this session.',help:'Prepare a Gmail draft for review. Nothing is sent automatically.',fallback:'Your invoice has been downloaded. Attach it to the Gmail draft and confirm that Finance Department is selected as the sender.',success:'Gmail draft created with the PDF attached and Finance Department as sender. Review it in Gmail before sending.',blocked:'If Gmail did not open, use the link below.',uncertain:'Gmail may have saved this draft. Check Gmail Drafts before preparing another email.',failed:'Gmail draft creation could not be completed. Your PDF is available below. You can prepare the email manually in Gmail.',wrongAccount:'Sign in with gianmoska@gmail.com to create a Finance draft.',alias:'The verified Finance sender was not found. Check Gmail’s Send mail as settings.',auth:'Gmail authorisation was not completed. Connect Gmail to try again, or prepare the email manually.',pdf:'The invoice PDF could not be generated. Please try Download or Print / Save as PDF.',invalid:'Check the recipient, document number, currency and dates before preparing the email.',tooLarge:'The PDF exceeds the 10 MB email attachment limit. Download it and attach it manually.',notDue:'Not specified',greeting:n=>`Dear ${n},`,body:(type,no,total,due)=>`Please find attached ${type.toLowerCase()} ${no} from MOSCATELLI.\n\nDocument total: ${total}\nDue date: ${due}\n\nShould you require any further information, please do not hesitate to contact us.\n\nKind regards,`,fallbackName:'Sir/Madam',labels:['REFERENCE','ISSUE DATE','DUE DATE','CURRENCY','ISSUED BY','TO','PAID TO','SUPPLIER','DESCRIPTION','QTY','UNIT','AMOUNT','NOTE','SUBTOTAL','VAT','TOTAL','PAYMENT METHOD','PAYMENT REFERENCE','IBAN / ACCOUNT','AUTHORISED BY','DOCUMENT CLASS','DOCUMENT VALUE','PAGE','CONTINUED'],statuses:['DRAFT','ISSUED','PAID','VOID'],classes:['EXTERNAL','INTERNAL','CONFIDENTIAL'],services:'Consultancy / Professional Services'},
    pt:{locale:'pt-PT',types:['Fatura','Registo de pagamento','Orçamento','Fatura proforma','Registo de despesa','Ordem de compra','Pedido de adiantamento'],prepare:'Preparar email',preparing:'A preparar a fatura…',creating:'A criar rascunho no Gmail…',open:'Abrir rascunho no Gmail',download:'Descarregar PDF',drafts:'Abrir rascunhos do Gmail',close:'Fechar',connect:'Ligar ao Gmail',disconnect:'Desligar do Gmail',connected:'Gmail Finance ligado nesta sessão.',help:'Prepare um rascunho no Gmail para revisão. Nenhum email é enviado automaticamente.',fallback:'A sua fatura foi descarregada. Anexe-a ao rascunho no Gmail e confirme que Finance Department está selecionado como remetente.',success:'Rascunho criado no Gmail com o PDF anexado e Finance Department como remetente. Reveja-o antes de enviar.',blocked:'Se o Gmail não abriu, utilize a ligação abaixo.',uncertain:'O Gmail pode ter guardado este rascunho. Verifique os rascunhos antes de preparar outro email.',failed:'Não foi possível concluir o rascunho. O PDF está disponível abaixo. Pode preparar o email manualmente no Gmail.',wrongAccount:'Inicie sessão com gianmoska@gmail.com para criar um rascunho Finance.',alias:'O remetente Finance verificado não foi encontrado. Verifique as definições Enviar correio como no Gmail.',auth:'A autorização do Gmail não foi concluída. Ligue-se ao Gmail ou prepare o email manualmente.',pdf:'Não foi possível gerar o PDF. Tente Descarregar ou Imprimir / Guardar como PDF.',invalid:'Verifique o destinatário, número do documento, moeda e datas.',tooLarge:'O PDF excede o limite de 10 MB. Descarregue-o e anexe-o manualmente.',notDue:'Não indicada',greeting:n=>`Exmo./Exma. ${n},`,body:(type,no,total,due)=>`Segue em anexo o documento ${type.toLowerCase()} ${no} da MOSCATELLI.\n\nValor total: ${total}\nData de vencimento: ${due}\n\nCaso necessite de informações adicionais, estamos à sua disposição.\n\nCom os melhores cumprimentos,`,fallbackName:'Senhor(a)',labels:['REFERÊNCIA','DATA DE EMISSÃO','VENCIMENTO','MOEDA','EMITIDO POR','PARA','PAGO A','FORNECEDOR','DESCRIÇÃO','QTD.','UNITÁRIO','VALOR','NOTA','SUBTOTAL','IVA','TOTAL','MÉTODO DE PAGAMENTO','REFERÊNCIA DE PAGAMENTO','IBAN / CONTA','AUTORIZADO POR','CLASSE DO DOCUMENTO','VALOR DO DOCUMENTO','PÁGINA','CONTINUAÇÃO'],statuses:['RASCUNHO','EMITIDO','PAGO','ANULADO'],classes:['EXTERNO','INTERNO','CONFIDENCIAL'],services:'Consultoria / Serviços profissionais'},
    it:{locale:'it-IT',types:['Fattura','Ricevuta di pagamento','Preventivo','Fattura proforma','Nota spese','Ordine di acquisto','Richiesta di acconto'],prepare:'Prepara email',preparing:'Preparazione della fattura…',creating:'Creazione della bozza Gmail…',open:'Apri bozza Gmail',download:'Scarica PDF',drafts:'Apri bozze Gmail',close:'Chiudi',connect:'Collega Gmail',disconnect:'Scollega Gmail',connected:'Gmail Finance collegato per questa sessione.',help:'Prepara una bozza Gmail da controllare. Nessuna email viene inviata automaticamente.',fallback:'La fattura è stata scaricata. Allegala alla bozza Gmail e verifica che Finance Department sia selezionato come mittente.',success:'Bozza Gmail creata con il PDF allegato e Finance Department come mittente. Controllala prima di inviare.',blocked:'Se Gmail non si è aperto, usa il collegamento qui sotto.',uncertain:'Gmail potrebbe aver salvato la bozza. Controlla le bozze prima di preparare un’altra email.',failed:'Non è stato possibile completare la bozza. Il PDF è disponibile qui sotto. Puoi preparare l’email manualmente in Gmail.',wrongAccount:'Accedi con gianmoska@gmail.com per creare una bozza Finance.',alias:'Il mittente Finance verificato non è stato trovato. Controlla le impostazioni Invia messaggio come in Gmail.',auth:'L’autorizzazione Gmail non è stata completata. Collega Gmail o prepara l’email manualmente.',pdf:'Impossibile generare il PDF. Prova Scarica o Stampa / Salva come PDF.',invalid:'Controlla destinatario, numero del documento, valuta e date.',tooLarge:'Il PDF supera il limite di 10 MB. Scaricalo e allegalo manualmente.',notDue:'Non indicata',greeting:n=>`Gentile ${n},`,body:(type,no,total,due)=>`In allegato trova il documento ${type.toLowerCase()} ${no} di MOSCATELLI.\n\nImporto totale: ${total}\nData di scadenza: ${due}\n\nPer qualsiasi ulteriore informazione, non esiti a contattarci.\n\nCordiali saluti,`,fallbackName:'Cliente',labels:['RIFERIMENTO','DATA DI EMISSIONE','SCADENZA','VALUTA','EMESSO DA','A','PAGATO A','FORNITORE','DESCRIZIONE','QTÀ','UNITARIO','IMPORTO','NOTA','SUBTOTALE','IVA','TOTALE','METODO DI PAGAMENTO','RIFERIMENTO PAGAMENTO','IBAN / CONTO','AUTORIZZATO DA','CLASSE DOCUMENTO','VALORE DOCUMENTO','PAGINA','SEGUE'],statuses:['BOZZA','EMESSO','PAGATO','ANNULLATO'],classes:['ESTERNO','INTERNO','RISERVATO'],services:'Consulenza / Servizi professionali'}
  };
  const lang=value=>languages[value] || languages.en;
  const error=code=>Object.assign(new Error(code),{code});
  function cleanHeader(value,max=120){
    if(typeof value!=='string'||!value.trim()||value.length>max||/[\x00-\x1f\x7f]/.test(value))throw error('invalid');
    return value.trim();
  }
  function template(data){
    const l=lang(data.language);
    const to=cleanHeader(data.sendTo,254);
    if(!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(to))throw error('invalid');
    const number=cleanHeader(data.invoiceNumber,80);
    const index=TYPES.indexOf(data.documentType);if(index<0)throw error('invalid');
    const total=Number(data.total);
    if(!Number.isFinite(total)||total<0||total>999999999.99||!['EUR','GBP','USD','CHF','BRL'].includes(data.currency))throw error('invalid');
    let due=l.notDue;
    if(data.dueDate){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate))throw error('invalid');
      const date=new Date(data.dueDate+'T12:00:00Z');
      if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==data.dueDate)throw error('invalid');
      due=new Intl.DateTimeFormat(l.locale,{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(date);
    }
    const name=String(data.recipient||'').split(/\r?\n/)[0].replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,160)||l.fallbackName;
    const formatted=new Intl.NumberFormat(l.locale,{style:'currency',currency:data.currency}).format(total);
    const type=l.types[index];
    let body=`${l.greeting(name)}\n\n${l.body(type,number,formatted,due)}\n\nFinance Department\nMOSCATELLI\n${FROM}`;
    if(data.language==='en'||!languages[data.language]) body=body.replace('Document total:','Invoice total:');
    const subject=`MOSCATELLI · ${type} ${number}`;
    const filename=`MOSCATELLI-${TYPES[index].replace(/[^a-z0-9-]/gi,'-')}-${number.replace(/[^a-z0-9_-]/gi,'_')}.pdf`;
    return {to,subject,body,filename};
  }
  function composeUrl(message){
    const url=new URL('https://mail.google.com/mail/');
    url.search=new URLSearchParams({authuser:ACCOUNT,view:'cm',fs:'1',to:message.to,su:message.subject,body:message.body}).toString();return url.href;
  }
  const draftsUrl=()=>`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(ACCOUNT)}#drafts`;
  const draftUrl=messageId=>`${draftsUrl()}?compose=${encodeURIComponent(messageId)}`;
  function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
  const encoded=text=>base64(new TextEncoder().encode(text));
  function encodedHeader(text){
    const chunks=[];let chunk='';
    for(const char of text){if(new TextEncoder().encode(chunk+char).length>42){chunks.push(chunk);chunk='';}chunk+=char;}
    if(chunk)chunks.push(chunk);
    return chunks.map(value=>`=?UTF-8?B?${encoded(value)}?=`).join('\r\n ');
  }
  const fold=text=>text.match(/.{1,76}/g)?.join('\r\n')||'';
  async function mime(data,blob){
    if(!(blob instanceof Blob)||blob.type!=='application/pdf'||blob.size===0||blob.size>MAX_PDF)throw error('tooLarge');
    if(await blob.slice(0,5).text()!=='%PDF-')throw error('pdf');
    const message=template(data),boundary='moscatelli_'+crypto.randomUUID().replace(/-/g,'');
    const raw=[`From: Finance Department <${FROM}>`,`To: ${message.to}`,`Subject: ${encodedHeader(message.subject)}`,`MIME-Version: 1.0`,`Content-Type: multipart/mixed; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',fold(encoded(message.body)),`--${boundary}`,'Content-Type: application/pdf',`Content-Disposition: attachment; filename="${message.filename}"`,'Content-Transfer-Encoding: base64','',fold(base64(new Uint8Array(await blob.arrayBuffer()))),`--${boundary}--`,''].join('\r\n');
    return encoded(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  let token=null,expires=0,client=null,authPending=null;
  const clientId=window.MOSCATELLI_EMAIL_CONFIG?.googleClientId || '';
  const configured=()=>/^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId);
  const connected=()=>!!token&&Date.now()<expires;
  function disconnect(){token=null;expires=0;}
  if(configured()){
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;document.head.appendChild(script);
  }
  function authorize(){
    if(connected())return Promise.resolve();
    if(authPending)return authPending;
    if(!configured()||!window.google?.accounts?.oauth2)return Promise.reject(error('auth'));
    authPending=new Promise((resolve,reject)=>{
      let settled=false;
      const fail=()=>{settled=true;clearTimeout(timer);disconnect();reject(error('auth'));};
      const timer=setTimeout(fail,120000);
      client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:SCOPES.join(' '),hint:ACCOUNT,include_granted_scopes:false,
        callback:response=>{if(settled)return;clearTimeout(timer);if(!response.access_token||response.error||!google.accounts.oauth2.hasGrantedAllScopes(response,...SCOPES)){fail();return;}settled=true;token=response.access_token;expires=Date.now()+Math.max(0,Number(response.expires_in)-60)*1000;resolve();},error_callback:fail});
      client.requestAccessToken({prompt:'select_account'});
    }).then(verifyIdentity).finally(()=>authPending=null);
    return authPending;
  }
  async function request(path,options={}){
    if(!connected())throw error('auth');
    try{
      const response=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});
      if(!response.ok){if(response.status===401)disconnect();throw error(response.status===401?'auth':response.status===403?'permission':response.status>=500?'uncertain':'failed');}
      return await response.json();
    }catch(e){if(e.code)throw e;throw error('uncertain');}
  }
  async function verifyIdentity(){
    const profile=await request('profile?fields=emailAddress');
    if(profile.emailAddress?.toLowerCase()!==ACCOUNT){disconnect();throw error('wrongAccount');}
    const alias=await request(`settings/sendAs/${encodeURIComponent(FROM)}?fields=sendAsEmail,verificationStatus`);
    if(alias.sendAsEmail?.toLowerCase()!==FROM||alias.verificationStatus!=='accepted'){disconnect();throw error('alias');}
  }
  async function createDraft(data,blob,onCreated){
    const raw=await mime(data,blob);
    await verifyIdentity(); // No invoice content is sent before account and sender checks pass.
    const draft=await request('drafts',{method:'POST',body:JSON.stringify({message:{raw}})});
    if(!draft.id||!draft.message?.id)throw error('uncertain');
    onCreated?.(draft); // Preserve the known draft even if verification/read-back fails.
    const readback=await request(`drafts/${encodeURIComponent(draft.id)}?format=full&fields=message(payload(headers,parts(filename,mimeType,body(size))))`);
    const from=readback.message?.payload?.headers?.find(h=>h.name.toLowerCase()==='from')?.value||'';
    const attachment=readback.message?.payload?.parts?.find(p=>p.mimeType==='application/pdf'&&p.filename===template(data).filename);
    if(!/^"?Finance Department"?\s*<finance@moscatelli\.co>$/i.test(from)||!attachment||attachment.body?.size!==blob.size)throw error('verify');
    return {draftId:draft.id,url:draftUrl(draft.message.id)};
  }
  window.addEventListener('pagehide',disconnect);
  window.MoscatelliEmail=Object.freeze({lang,template,composeUrl,draftsUrl,draftUrl,mime,configured,connected,authorize,disconnect,createDraft,MAX_PDF});
})();
