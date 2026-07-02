import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

function uniq(arr:any[]){return Array.from(new Set(arr.filter(Boolean))).sort()}
function typeLabel(t:string){return t==="audio"?"Audio":"PDF"}
function icon(t:string){return t==="audio"?"🎧":"📄"}
function dt(v:string){return v?new Date(v).toLocaleDateString("vi-VN"):"-"}

export default async function Library({searchParams}:{searchParams:Promise<any>}){
  const u=await requireUser();
  const sp=await searchParams;
  const type=String(sp.type||"pdf");
  const q=String(sp.q||"").toLowerCase();
  const level=String(sp.level||"all");
  const skill=String(sp.skill||"all");
  const unit=String(sp.unit||"all");
  const s=supabaseAdmin();
  const {data:allItems}=await s.from("exercise_library").select("*").order("created_at",{ascending:false});
  const all=allItems||[];
  const pdfCount=all.filter((x:any)=>x.type==="pdf").length;
  const audioCount=all.filter((x:any)=>x.type==="audio").length;
  const typed=all.filter((x:any)=>x.type===type);
  let items=typed;
  if(level!=="all") items=items.filter((x:any)=>x.level===level);
  if(skill!=="all") items=items.filter((x:any)=>x.skill===skill);
  if(unit!=="all") items=items.filter((x:any)=>x.unit===unit);
  if(q) items=items.filter((x:any)=>[x.title,x.file_name,x.level,x.skill,x.unit,x.description].join(" ").toLowerCase().includes(q));

  const uploaderIds=uniq(items.map((x:any)=>x.uploaded_by));
  const {data:uploaders}=uploaderIds.length?await s.from("app_users").select("id,name,phone").in("id",uploaderIds):{data:[] as any[]};
  const um=new Map((uploaders||[]).map((x:any)=>[x.id,x]));
  const enriched=[];
  for(const it of items){
    let url="";
    const signed=await s.storage.from("exercise-library").createSignedUrl(it.file_path,3600);
    if(signed.data?.signedUrl) url=signed.data.signedUrl;
    else url=s.storage.from("exercise-library").getPublicUrl(it.file_path).data.publicUrl;
    enriched.push({...it,url,uploader:um.get(it.uploaded_by)});
  }
  const levels=uniq(typed.map((x:any)=>x.level));
  const skills=uniq(typed.map((x:any)=>x.skill));
  const units=uniq(typed.map((x:any)=>x.unit));

  return <>
    <div className="pageRibbon"><div className="screenTitle">
      <div>
        <h1>Thư viện bài tập</h1>
        <p>Tìm nhanh PDF/audio theo tên, khối, kỹ năng, unit, người upload. Có thêm/sửa/xóa metadata giống demo V48.</p>
      </div>
      <span className="chip active">Thư viện nội bộ</span>
    </div></div>

    <div className="libraryTabsV5">
      <a className={type==="pdf"?"active":""} href="/library?type=pdf">📄 PDF ({pdfCount})</a>
      <a className={type==="audio"?"active":""} href="/library?type=audio">🎧 Audio ({audioCount})</a>
    </div>

    <section className="sectionCard">
      <div className="sectionHead"><div><h2 className="sectionTitle">Bộ lọc thư viện</h2><p className="sectionHint">Lọc theo khối, kỹ năng, unit và từ khóa.</p></div><span className="pill blue">{enriched.length} tài liệu</span></div>
      <form className="form compact">
        <input type="hidden" name="type" value={type}/>
        <label>Tìm tài liệu<input name="q" defaultValue={q} placeholder="Tên file, unit, kỹ năng..."/></label>
        <label>Khối / Level<select name="level" defaultValue={level}><option value="all">Tất cả</option>{levels.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label>Kỹ năng<select name="skill" defaultValue={skill}><option value="all">Tất cả</option>{skills.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <label>Unit<select name="unit" defaultValue={unit}><option value="all">Tất cả</option>{units.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
        <div className="actions full"><button className="primary">Lọc tài liệu</button><a className="btn ghost" href={`/library?type=${type}`}>Xóa lọc</a></div>
      </form>
    </section>

    <details className="panel modalLike" open={false}>
      <summary className="summaryLink"><span>📤 Thêm tài liệu mới</span><span className="pill red">PDF / Audio</span></summary>
      <div className="formCard"><form className="form" action="/api/library/create" method="post" encType="multipart/form-data">
        <label>Loại<select name="type" defaultValue={type}><option value="pdf">PDF</option><option value="audio">Audio</option></select></label>
        <label>Tên tài liệu<input name="title" required placeholder="Unit 5 - Listening practice"/></label>
        <label>Khối<input name="level" placeholder="G1, G2, G3..."/></label>
        <label>Kỹ năng<input name="skill" placeholder="Listening / Reading / Writing..."/></label>
        <label>Unit<input name="unit" placeholder="Unit 6"/></label>
        <label className="full">Mô tả<textarea name="description" placeholder="Ghi chú cách dùng tài liệu, nhóm lớp phù hợp..."/></label>
        <label className="full">Chọn file<input type="file" name="file" required/></label>
        <div className="full"><button className="primary">Upload tài liệu</button></div>
      </form></div>
    </details>

    <div className="libraryGridV5">
      {enriched.map((it:any)=><div className="libraryCardV5" key={it.id}>
        <div className="libraryCardHeadV5"><div className="libraryTypeIcon">{icon(it.type)}</div><div><h2>{it.title}</h2><p>{it.file_name}</p></div><span className={`pill ${it.type==="audio"?"orange":"blue"}`}>{typeLabel(it.type)}</span></div>
        <div className="chipRow"><span className="pill blue">{it.level||"All"}</span><span className="pill red">{it.skill||"-"}</span><span className="pill gray">{it.unit||"-"}</span></div>
        <div className="noteBlock">{it.description||"Chưa có mô tả cho tài liệu này."}</div>
        <div className="libraryMetaGrid"><span><b>Upload bởi</b>{it.uploader?.name||"-"}</span><span><b>Ngày tạo</b>{dt(it.created_at)}</span><span><b>Cập nhật</b>{dt(it.updated_at)}</span></div>
        <div className="actions"><a className="btn primary" href={it.url} target="_blank">Mở / tải file</a></div>
        <details className="modalLike"><summary className="summaryLink"><span>Sửa thông tin</span><span className="pill blue">Metadata</span></summary>
          <form className="formCard" action="/api/library/update" method="post">
            <input type="hidden" name="id" value={it.id}/><input type="hidden" name="type" value={type}/>
            <label>Tên tài liệu<input name="title" defaultValue={it.title} required/></label>
            <label>Khối<input name="level" defaultValue={it.level||""}/></label>
            <label>Kỹ năng<input name="skill" defaultValue={it.skill||""}/></label>
            <label>Unit<input name="unit" defaultValue={it.unit||""}/></label>
            <label className="full">Mô tả<textarea name="description" defaultValue={it.description||""}/></label>
            <div className="full"><button className="primary">Lưu metadata</button></div>
          </form>
        </details>
        <details className="modalLike"><summary className="summaryLink"><span>Xóa tài liệu</span><span className="pill red">Xác nhận</span></summary>
          <form className="formCard" action="/api/library/delete" method="post"><input type="hidden" name="id" value={it.id}/><input type="hidden" name="file_path" value={it.file_path}/><input type="hidden" name="type" value={type}/><p className="mini">Xóa cả metadata và file trong Supabase Storage.</p><button className="danger">Xóa tài liệu này</button></form>
        </details>
      </div>)}
    </div>
    {!enriched.length&&<div className="empty">Không tìm thấy tài liệu phù hợp bộ lọc.</div>}
  </>
}
