"use client";
function rr(ctx:any,x:number,y:number,w:number,h:number,r:number,fill:string,stroke="#fecdd3"){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
  ctx.fillStyle=fill;
  ctx.fill();
  ctx.strokeStyle=stroke;
  ctx.lineWidth=2;
  ctx.stroke();
}
function dl(url:string,name:string){const a=document.createElement("a");a.href=url;a.download=name;a.click()}
function lines(ctx:any,t:string,x:number,y:number,w:number,lh:number,n=99){
  let line="", c=0;
  for(const word of String(t||"").split(/\s+/)){
    const test=line?line+" "+word:word;
    if(ctx.measureText(test).width>w && line){ctx.fillText(line,x,y); y+=lh; line=word; if(++c>=n) break}
    else line=test;
  }
  if(line && c<n) ctx.fillText(line,x,y);
}
function drawBar(ctx:any,x:number,y:number,h:number,val:number,label:string){
  rr(ctx,x,y,86,h,42,"#fce7ef");
  const fillH = Math.max(52, h * (val/5));
  rr(ctx,x,y+h-fillH,86,fillH,42,"#e11d48");
  ctx.fillStyle="#be123c"; ctx.font="bold 24px Arial"; ctx.textAlign="center"; ctx.fillText(`${val}/5`,x+43,y+h+38);
  ctx.fillStyle="#64748b"; ctx.font="bold 20px Arial"; ctx.fillText(label,x+43,y+h+72);
  ctx.textAlign="left";
}

export function TuitionImage({row}:{row:any}){
  function make(){
    const c=document.createElement("canvas");
    c.width=1800; c.height=1040;
    const ctx=c.getContext("2d")!;
    ctx.fillStyle="#fff7f8"; ctx.fillRect(0,0,1800,1040);
    rr(ctx,30,30,1740,980,34,"#fff");

    ctx.fillStyle="#be123c"; ctx.font="bold 58px Arial"; ctx.fillText("Ms.Giang English",84,110);
    ctx.fillStyle="#fb7185"; ctx.font="30px Arial"; ctx.fillText("Thông báo học phí",86,152);
    rr(ctx,1370,70,300,64,24,"#fff8fa");
    ctx.fillStyle="#be123c"; ctx.font="bold 26px Arial"; ctx.textAlign="center"; ctx.fillText("Tháng 06 / 2026",1520,112); ctx.textAlign="left";

    rr(ctx,84,200,1588,124,24,"#fff8fa");
    ctx.fillStyle="#111827"; ctx.font="bold 46px Arial"; ctx.fillText(row.student_name,118,268);
    ctx.fillStyle="#64748b"; ctx.font="30px Arial"; ctx.fillText(`Lớp: ${row.class_name}`,118,308);
    ctx.fillText(`Liên hệ: Phụ huynh`,760,288);

    const stats = [["Có mặt",row.present],["Muộn",row.late],["Học bù",row.makeup],["Vắng",row.absent]];
    stats.forEach((it,i)=>{
      const x=84+i*286, y=380;
      rr(ctx,x,y,240,160,24,"#fff");
      ctx.fillStyle="#6b7280"; ctx.font="32px Arial"; ctx.fillText(String(it[0]),x+24,y+54);
      ctx.fillStyle="#e11d48"; ctx.font="bold 68px Arial"; ctx.fillText(String(it[1]),x+24,y+132);
    });

    rr(ctx,84,590,760,180,26,"#fff1f2");
    ctx.fillStyle="#9f1239"; ctx.font="bold 32px Arial"; ctx.fillText("Học phí cần đóng",116,650);
    ctx.fillStyle="#e11d48"; ctx.font="bold 80px Arial"; ctx.fillText(row.amount_text,116,742);

    rr(ctx,900,380,772,390,26,"#fff8fa");
    ctx.fillStyle="#111827"; ctx.font="bold 36px Arial"; ctx.fillText("Nội dung gửi phụ huynh",936,434);
    ctx.fillStyle="#374151"; ctx.font="28px Arial";
    lines(ctx,row.message,936,500,690,42,8);
    ctx.fillStyle="#64748b"; ctx.font="30px Arial";
    ctx.fillText(`Buổi tính phí: ${row.billable} buổi`,936,650);
    ctx.fillText(`Trạng thái: Chưa đóng học phí`,936,702);

    rr(ctx,84,812,1588,136,24,"#fff8fa");
    ctx.fillStyle="#be123c"; ctx.font="bold 28px Arial"; ctx.fillText("Demo: tải ảnh về để gửi phụ huynh qua Zalo / Messenger.",118,887);

    dl(c.toDataURL("image/png"),`hocphi_${row.student_name}.png`);
  }
  return <button className="ghost" onClick={make}>Tạo ảnh</button>
}

export function EvalImage({data}:{data:any}){
  function make(){
    const c=document.createElement("canvas");
    c.width=1800; c.height=1040;
    const ctx=c.getContext("2d")!;
    ctx.fillStyle="#fff7f8"; ctx.fillRect(0,0,1800,1040);
    rr(ctx,30,30,1740,980,34,"#fff");

    const vals=[data.listening,data.speaking,data.reading,data.writing,data.vocabulary,data.participation,data.homework].map((v:any)=>Number(v||0));
    const avg = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);

    ctx.fillStyle="#be123c"; ctx.font="bold 58px Arial"; ctx.fillText("Ms.Giang English",84,110);
    ctx.fillStyle="#fb7185"; ctx.font="30px Arial"; ctx.fillText("Đánh giá học sinh",86,152);
    rr(ctx,1370,70,300,64,24,"#fff8fa");
    ctx.fillStyle="#be123c"; ctx.font="bold 26px Arial"; ctx.textAlign="center"; ctx.fillText(`Tổng ${avg}/5`,1520,112); ctx.textAlign="left";

    rr(ctx,84,200,1588,124,24,"#fff8fa");
    ctx.fillStyle="#111827"; ctx.font="bold 46px Arial"; ctx.fillText(data.student_name,118,268);
    ctx.fillStyle="#64748b"; ctx.font="30px Arial"; ctx.fillText(`Lớp: ${data.class_name}`,118,308);
    ctx.fillText(`Trạng thái: ${data.status === "published" ? "Đã gửi phụ huynh" : "Bản nháp"}`,760,288);

    rr(ctx,84,380,720,520,26,"#fff");
    ctx.fillStyle="#111827"; ctx.font="bold 36px Arial"; ctx.fillText("Biểu đồ cột kỹ năng",118,436);
    const labels=["Listen","Speak","Read","Write","Vocab","Part.","HW"];
    vals.forEach((v,i)=>drawBar(ctx,128+i*92,490,240,v||3,labels[i]));

    rr(ctx,856,380,816,520,26,"#fff8fa");
    ctx.fillStyle="#111827"; ctx.font="bold 36px Arial"; ctx.fillText("Nhận xét giáo viên",892,436);
    let y=474;
    const blocks:[[string,string], [string,string], [string,string], [string,string]] = [
      ["Tổng quan", data.comment || ""],
      ["Điểm mạnh", data.strengths || ""],
      ["Cần cải thiện", data.improvements || ""],
      ["Gợi ý phụ huynh", data.suggestion || ""],
    ];
    for(const [title,text] of blocks){
      rr(ctx,890,y,748,88,18,"#fff");
      ctx.fillStyle="#111827"; ctx.font="bold 24px Arial"; ctx.fillText(title,916,y+33);
      ctx.fillStyle="#374151"; ctx.font="22px Arial"; lines(ctx,text,916,y+64,690,28,1);
      y+=106;
    }

    rr(ctx,84,926,1588,52,20,"#fff8fa");
    ctx.fillStyle="#be123c"; ctx.font="bold 24px Arial"; ctx.fillText("Demo: tải ảnh đánh giá để gửi phụ huynh.",118,960);

    dl(c.toDataURL("image/png"),`danhgia_${data.student_name}.png`);
  }
  return <button className="ghost" onClick={make}>Tạo ảnh</button>
}
