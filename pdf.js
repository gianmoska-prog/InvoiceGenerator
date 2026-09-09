/* PDF export of the existing paginated document. Text stays text; rules stay vectors. */
(() => {
  'use strict';
  const mmPerPixel=210/625;
  const ptPerPixel=mmPerPixel*72/25.4;
  const files={normal:'Regular',italic:'Italic',bold:'Bold',bolditalic:'BoldItalic'};
  const assets=new Map();
  const bytes=url=>{
    if(!assets.has(url)) assets.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error('PDF asset unavailable');return r.arrayBuffer();}).then(b=>new Uint8Array(b)).catch(e=>{assets.delete(url);throw e;}));
    return assets.get(url);
  };
  function base64(data){let result='';for(let i=0;i<data.length;i+=32768)result+=String.fromCharCode(...data.subarray(i,i+32768));return btoa(result);}
  function color(value){const nums=value.match(/[\d.]+/g)?.map(Number);return nums&&nums.length>=3&&nums[3]!==0?nums.slice(0,3):null;}
  const metricCanvas=document.createElement('canvas');
  const metrics=metricCanvas.getContext('2d');
  function drawText(pdf,node,origin){
    if(!node.textContent.trim())return;
    const parent=node.parentElement,style=getComputedStyle(parent);
    const size=parseFloat(style.fontSize),spacing=parseFloat(style.letterSpacing)||0;
    const italic=style.fontStyle==='italic',bold=Number(style.fontWeight)>=600;
    const font=(bold?'bold':'')+(italic?'italic':'')||'normal';
    const ink=color(style.color);if(!ink)return;
    pdf.setFont('Tinos',font);pdf.setFontSize(size*ptPerPixel);pdf.setTextColor(...ink);
    metrics.font=`${style.fontStyle} ${style.fontWeight} ${size}px Tinos`;
    const measured=metrics.measureText('Hg');
    const ascent=measured.fontBoundingBoxAscent || size*.89;
    const range=document.createRange();let offset=0,lines=[],line=null;
    for(const character of node.textContent){
      range.setStart(node,offset);offset+=character.length;range.setEnd(node,offset);
      const rect=range.getBoundingClientRect();
      if(!rect.width||!rect.height||character==='\n'||character==='\r')continue;
      if(!line || Math.abs(line.top-rect.top)>.5){line={top:rect.top,left:rect.left,text:''};lines.push(line);}
      line.text+=character==='\t'?' ':character;
    }
    for(const line of lines){
      if(!line.text.trim())continue;
      pdf.text(line.text,(line.left-origin.left)*mmPerPixel,(line.top-origin.top+ascent)*mmPerPixel,{charSpace:spacing*mmPerPixel,baseline:'alphabetic'});
    }
  }
  async function drawElement(pdf,element,origin){
    const style=getComputedStyle(element);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return;
    const rect=element.getBoundingClientRect();
    const x=(rect.left-origin.left)*mmPerPixel,y=(rect.top-origin.top)*mmPerPixel,w=rect.width*mmPerPixel,h=rect.height*mmPerPixel;
    const fill=color(style.backgroundColor);
    if(fill&&w&&h){pdf.setFillColor(...fill);pdf.rect(x,y,w,h,'F');}
    for(const [side,x1,y1,x2,y2] of [['Top',x,y,x+w,y],['Right',x+w,y,x+w,y+h],['Bottom',x,y+h,x+w,y+h],['Left',x,y,x,y+h]]){
      const width=parseFloat(style[`border${side}Width`]);const ink=color(style[`border${side}Color`]);
      if(width&&ink&&style[`border${side}Style`]!=='none'){pdf.setDrawColor(...ink);pdf.setLineWidth(width*mmPerPixel);pdf.line(x1,y1,x2,y2);}
    }
    if(element.tagName==='IMG'){
      await element.decode();
      let iw=w,ih=h,ix=x,iy=y;
      if(style.objectFit==='contain'){
        const ratio=Math.min(w/element.naturalWidth,h/element.naturalHeight);iw=element.naturalWidth*ratio;ih=element.naturalHeight*ratio;
        if(!style.objectPosition.startsWith('0%')&&!style.objectPosition.startsWith('left'))ix+=(w-iw)/2;
        iy+=(h-ih)/2;
      }
      pdf.addImage(await bytes(element.src),'PNG',ix,iy,iw,ih,undefined,'FAST');return;
    }
    for(const child of element.childNodes){
      if(child.nodeType===Node.TEXT_NODE)drawText(pdf,child,origin);
      else if(child.nodeType===Node.ELEMENT_NODE)await drawElement(pdf,child,origin);
    }
  }
  async function create(pages,host){
    const pdf=new window.jspdf.jsPDF({unit:'mm',format:[210,297],orientation:'portrait',compress:true,putOnlyUsedFonts:true});
    for(const [style,suffix] of Object.entries(files)){
      const name=`Tinos-${suffix}.ttf`;pdf.addFileToVFS(name,base64(await bytes(`assets/fonts/${name}`)));pdf.addFont(name,'Tinos',style);
    }
    pdf.setProperties({title:'MOSCATELLI financial document',creator:'MOSCATELLI Invoice Generator'});
    for(let i=0;i<pages.length;i++){
      if(i)pdf.addPage([210,297],'portrait');
      host.replaceChildren(pages[i]);
      const origin=pages[i].getBoundingClientRect();
      await drawElement(pdf,pages[i],origin);
    }
    return pdf;
  }
  window.MoscatelliPDF=Object.freeze({create});
})();
