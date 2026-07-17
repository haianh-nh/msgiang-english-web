/* Phase 8D.3: Shared report image/canvas helpers for tuition and evaluation. */
function wrapCanvasLines(ctx,text,maxWidth){
      const paragraphs=String(text||'').split(/\n/); const lines=[];
      paragraphs.forEach(p=>{
        const words=String(p).split(/\s+/).filter(Boolean);
        if(!words.length){lines.push(''); return}
        let line='';
        words.forEach(word=>{
          const test=line?line+' '+word:word;
          if(ctx.measureText(test).width>maxWidth && line){lines.push(line); line=word}else line=test;
        });
        if(line) lines.push(line);
      });
      return lines;
    }

function drawCanvasText(ctx,text,x,y,maxWidth,lineHeight,color='#1f2937',font='28px Arial',maxLines=99){
      ctx.fillStyle=color; ctx.font=font;
      const lines=wrapCanvasLines(ctx,text,maxWidth).slice(0,maxLines);
      lines.forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight));
      return y + lines.length*lineHeight;
    }

function roundedRectPath(ctx,x,y,w,h,r){
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    }

function fillRoundRect(ctx,x,y,w,h,r,fill,stroke=''){ roundedRectPath(ctx,x,y,w,h,r); if(fill){ctx.fillStyle=fill; ctx.fill()} if(stroke){ctx.strokeStyle=stroke; ctx.lineWidth=2; ctx.stroke()} }

function triggerDownload(url,fileName){ const a=document.createElement('a'); a.href=url; a.download=fileName; document.body.appendChild(a); a.click(); a.remove(); }

function openGeneratedImageModal(title,url,fileName,hint){
      modal(`<div class="modalHead"><h2>${title}</h2><button class="close" onclick="closeModal()">×</button></div>
      <div class="sharePreviewWrap"><img src="${url}" alt="${title}"><div class="shareHint">${hint||'Ảnh  có thể tải về và gửi phụ huynh qua Zalo.'}</div>
      <div class="billingActions" style="justify-content:flex-end"><button class="btn ghost" onclick="closeModal()">Đóng</button><button class="btn primary" onclick="triggerDownload('${url}','${fileName}')">Tải ảnh PNG</button></div></div>`)
    }
