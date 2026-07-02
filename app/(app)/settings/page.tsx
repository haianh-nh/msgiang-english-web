import { requireUser } from "@/lib/auth";
export default async function Settings(){const u=await requireUser(); return <><h1>Cài đặt</h1><div className="panel"><h2>Thông tin hệ thống</h2><p>Role hiện tại: {u.role}</p><p>Cổng phụ huynh đã bỏ khỏi bản web thật v1. Phụ huynh nhận ảnh học phí/đánh giá qua Zalo hoặc Messenger.</p></div></>}
