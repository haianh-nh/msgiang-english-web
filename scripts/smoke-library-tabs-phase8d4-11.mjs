import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const runtimeSource = fs.readFileSync(path.join(root, 'public/v15/modules/homework-library-runtime.js'), 'utf8');
const librarySource = fs.readFileSync(path.join(root, 'public/v15/modules/library.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'public/v15/app.js'), 'utf8');

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
let renderCount = 0;
const context = {
  console, Map, Set, Promise, Object, Array, String, Number, Boolean, Date, Math, Error,
  encodeURIComponent, setTimeout, clearTimeout,
  db: {
    exerciseLibrary: [
      { id: 'word-1', type: 'word', extension: 'docx', fileName: 'a.docx', title: 'Word' },
      { id: 'pdf-1', type: 'pdf', extension: 'pdf', fileName: 'a.pdf', title: 'PDF' },
      { id: 'pdf-legacy', type: 'word', extension: 'pdf', fileName: 'legacy.pdf', title: 'Legacy PDF' },
      { id: 'audio-1', type: 'audio', extension: 'mp3', fileName: 'a.mp3', title: 'Audio' },
    ],
    libraryTab: 'word', libraryQ: '', libraryLevel: 'all', librarySkill: 'all', libraryUnit: 'all',
  },
  v18Memo: {},
  v18FastKey: () => `smoke-${renderCount}`,
  smartSearchIndex: (...values) => values.join(' ').toLowerCase(),
  smartSearchMatch: (haystack, needle) => haystack.includes(String(needle).toLowerCase()),
  h: escapeHtml,
  canManageOperations: () => true,
  isTeachingUser: () => true,
  isParent: () => false,
  v18bSetLocalUiState: () => {},
  render: () => { renderCount += 1; },
  canManageLibrary: () => true,
  modal: () => {}, closeModal: () => {}, officialFetch: async () => ({ ok: true }),
};
context.window = context;
context.globalThis = context;
const sandbox = vm.createContext(context);
vm.runInContext(runtimeSource, sandbox, { filename: 'homework-library-runtime.js' });
vm.runInContext(librarySource, sandbox, { filename: 'library.js' });

vm.runInContext('ensureExerciseLibrary()', sandbox);
if (context.db.exerciseLibrary.find((x) => x.id === 'pdf-1')?.type !== 'pdf') {
  throw new Error('ensureExerciseLibrary vẫn đổi type PDF thành Word');
}

vm.runInContext("setLibraryTab('pdf')", sandbox);
if (context.db.libraryTab !== 'pdf') throw new Error('Bấm tab PDF không giữ libraryTab=pdf');
if (renderCount !== 1) throw new Error('Đổi tab PDF không render lại đúng một lần');
if (vm.runInContext('normalizeLibraryTab()', sandbox) !== 'pdf') throw new Error('normalizeLibraryTab đổi PDF về Word');

const pdfIds = vm.runInContext("libraryItems('pdf').map(x=>x.id).join(',')", sandbox);
if (new Set(pdfIds.split(',')).size !== 2 || !pdfIds.includes('pdf-1') || !pdfIds.includes('pdf-legacy')) throw new Error(`Danh sách PDF phân loại sai: ${pdfIds}`);
const pdfPage = vm.runInContext('homeworkPage()', sandbox);
if (!pdfPage.includes('PDF (2)') || !pdfPage.includes('2 tài liệu') || !pdfPage.includes('Legacy PDF')) {
  throw new Error('Trang PDF không hiển thị đầy đủ file PDF thật và PDF legacy');
}
if (!pdfPage.includes('class="active" onclick="setLibraryTab(\'pdf\')"')) {
  throw new Error('Tab PDF chưa được đánh dấu active');
}

vm.runInContext("setLibraryTab('word')", sandbox);
const wordIds = vm.runInContext("libraryItems('word').map(x=>x.id).join(',')", sandbox);
if (wordIds !== 'word-1') throw new Error(`Tab Word còn chứa PDF: ${wordIds}`);

if (runtimeSource.includes("db.libraryTab=(tab==='pdf'?'word':tab)") ||
    runtimeSource.includes("x?.type==='pdf'?{...x,type:'word'}") ||
    appSource.includes("if(db.libraryTab==='pdf') db.libraryTab='word") ||
    appSource.includes("if(x.type==='pdf')x.type='word'")) {
  throw new Error('Code ép PDF về Word vẫn còn tồn tại');
}

console.log('Phase 8D.4.11 library Word/PDF/Audio tab smoke đạt.');
