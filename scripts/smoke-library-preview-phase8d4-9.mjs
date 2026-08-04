import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const runtimeSource = fs.readFileSync(path.join(root, 'public/v15/modules/homework-library-runtime.js'), 'utf8');
const librarySource = fs.readFileSync(path.join(root, 'public/v15/modules/library.js'), 'utf8');
const previewRoute = fs.readFileSync(path.join(root, 'app/api/library/[id]/preview/route.ts'), 'utf8');
const fileRoute = fs.readFileSync(path.join(root, 'app/api/library/[id]/file/route.ts'), 'utf8');

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
let lastModal = null;
const context = {
  console, Map, Set, Promise, Object, Array, String, Number, Boolean, Date, Math, Error,
  encodeURIComponent, setTimeout, clearTimeout,
  db: {
    exerciseLibrary: [
      { id: 'pdf-legacy', type: 'word', extension: 'pdf', fileName: 'OPW-Test.pdf', title: 'OPW Test', level: 'A1', skill: 'Listening', unit: 'Unit 1', fileSize: 120000, uploadedAt: '2026-08-03T12:00:00Z', uploadedBy: 'Ms Bích', publicUrl: '' },
      { id: 'docx-1', type: 'word', extension: 'docx', fileName: 'worksheet.docx', title: 'Worksheet', level: 'G3', skill: 'Writing', unit: 'Unit 2', fileSize: 220000, uploadedAt: '2026-08-03T12:00:00Z', uploadedBy: 'Ms Kate', publicUrl: '' },
    ],
    libraryTab: 'word', libraryQ: '', libraryLevel: 'all', librarySkill: 'all', libraryUnit: 'all',
  },
  v18Memo: {},
  v18FastKey: () => 'smoke',
  smartSearchIndex: (...values) => values.join(' ').toLowerCase(),
  smartSearchMatch: (haystack, needle) => haystack.includes(String(needle).toLowerCase()),
  h: escapeHtml,
  canManageOperations: () => true,
  isTeachingUser: () => true,
  isParent: () => false,
  ensureExerciseLibrary: () => {},
  v18bSetLocalUiState: () => {},
  render: () => {},
  canManageLibrary: () => true,
  modal: (html, options = {}) => { lastModal = { html, options }; },
  closeModal: () => {},
  officialFetch: async () => ({ ok: true }),
};
context.window = context;
context.globalThis = context;
const sandbox = vm.createContext(context);
vm.runInContext(runtimeSource, sandbox, { filename: 'homework-library-runtime.js' });
vm.runInContext(librarySource, sandbox, { filename: 'library.js' });

if (vm.runInContext("libraryFileKind(db.exerciseLibrary[0])", sandbox) !== 'pdf') {
  throw new Error('File .pdf lưu nhầm type=word chưa được nhận diện thành PDF');
}
const pdfCard = vm.runInContext("libraryCard(db.exerciseLibrary[0],0)", sandbox);
for (const token of ['PDF', 'Xem trước', 'Tải xuống', 'Xóa', '/api/library/pdf-legacy/file?download=1']) {
  if (!pdfCard.includes(token)) throw new Error(`Thẻ PDF thiếu ${token}`);
}
if (/Mở\s*\/\s*tải/i.test(pdfCard)) throw new Error('Thẻ tài liệu vẫn còn wording Mở / tải');

vm.runInContext("openLibraryPreview('pdf-legacy')", sandbox);
if (!lastModal?.html.includes('pdfPreviewFrame') || !lastModal?.html.includes('/api/library/pdf-legacy/file')) {
  throw new Error('PDF preview chưa dùng iframe/endpoint fallback đúng');
}
if (lastModal?.options?.className !== 'libraryPreviewModal') throw new Error('PDF preview chưa dùng modal gần toàn màn hình');

vm.runInContext("renderWordPreviewResult(db.exerciseLibrary[1],{previewable:true,title:'Worksheet',fileName:'worksheet.docx',html:'<table><tr><td>Nội dung</td></tr></table>',messages:[]})", sandbox);
if (!lastModal?.html.includes('<table>') || lastModal?.html.includes('&lt;table&gt;')) {
  throw new Error('DOCX HTML bị escape hoặc không render được bảng');
}
if (!lastModal?.html.includes('docxPreviewDocument')) throw new Error('DOCX preview thiếu vùng tài liệu');

context.canManageOperations = () => false;
const noDeleteCard = vm.runInContext("libraryCard(db.exerciseLibrary[1],0)", sandbox);
if (noDeleteCard.includes('>Xóa<') || !noDeleteCard.includes('noDelete')) throw new Error('Phân quyền nút Xóa trên thẻ chưa đúng');

if (!previewRoute.includes('mammoth.convertToHtml') || !previewRoute.includes('sanitizeMammothHtml')) {
  throw new Error('API DOCX chưa chuyển HTML/lọc nội dung');
}
if (!fileRoute.includes('Content-Disposition') || !fileRoute.includes('attachment')) {
  throw new Error('API download chưa ép tải file');
}

console.log('Phase 8D.4.9 PDF/DOCX preview smoke đạt.');
