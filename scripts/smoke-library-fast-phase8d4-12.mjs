import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const runtimeSource = fs.readFileSync(path.join(root, 'public/v15/modules/homework-library-runtime.js'), 'utf8');
const librarySource = fs.readFileSync(path.join(root, 'public/v15/modules/library.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'public/v15/app.js'), 'utf8');
const warmupSource = fs.readFileSync(path.join(root, 'public/v15/smart-warmup.js'), 'utf8');
const bootstrapSource = fs.readFileSync(path.join(root, 'app/api/bootstrap/route.ts'), 'utf8');

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const elements = new Map();
for (const id of [
  'libraryFilter_level', 'libraryFilter_skill', 'libraryFilter_unit',
  'librarySearchInput', 'libraryResultCount', 'libraryKindChip',
  'libraryActiveFilters', 'libraryResultGrid', 'libraryReloadBtn',
]) elements.set(id, { id, innerHTML: '', textContent: '', value: '', disabled: false });

const tabButtons = ['all', 'word', 'pdf', 'audio'].map((tab) => ({
  tab,
  active: false,
  getAttribute(name) { return name === 'data-library-tab' ? this.tab : ''; },
  classList: { toggle: (_name, enabled) => { tabButtons.find((b) => b.tab === tab).active = !!enabled; } },
}));

let renderCount = 0;
let localStateWrites = 0;
const context = {
  console, Map, Set, Promise, Object, Array, String, Number, Boolean, Date, Math, Error,
  encodeURIComponent, setTimeout, clearTimeout,
  route: 'homework',
  document: {
    querySelectorAll: (selector) => selector === '[data-library-tab]' ? tabButtons : [],
    getElementById: (id) => elements.get(id) || null,
  },
  db: {
    exerciseLibrary: [
      { id: 'word-1', type: 'word', extension: 'docx', fileName: 'a.docx', title: 'Word A', level: 'G3', skill: 'Reading', unit: 'Unit 1', uploadedAt: '2026-08-04T01:00:00Z' },
      { id: 'pdf-1', type: 'pdf', extension: 'pdf', fileName: 'a.pdf', title: 'PDF A', level: 'G4', skill: 'Writing', unit: 'Unit 2', uploadedAt: '2026-08-04T02:00:00Z' },
      { id: 'pdf-legacy', type: 'word', extension: 'pdf', fileName: 'legacy.pdf', title: 'Legacy PDF', level: 'G5', skill: 'Other', unit: 'Review', uploadedAt: '2026-08-04T03:00:00Z' },
      { id: 'audio-1', type: 'audio', extension: 'mp3', fileName: 'a.mp3', title: 'Audio A', level: 'G2', skill: 'Listening', unit: 'Phonics', uploadedAt: '2026-08-04T04:00:00Z', publicUrl: '/audio.mp3' },
    ],
    libraryTab: 'all', libraryQ: '', libraryLevel: 'all', librarySkill: 'all', libraryUnit: 'all',
  },
  v18Memo: {},
  smartSearchIndex: (...values) => values.join(' ').toLowerCase(),
  smartSearchMatch: (haystack, needle) => haystack.includes(String(needle).toLowerCase()),
  h: escapeHtml,
  canManageOperations: () => true,
  isTeachingUser: () => true,
  isParent: () => false,
  canManageLibrary: () => true,
  v18bSetLocalUiState: () => { localStateWrites += 1; },
  render: () => { renderCount += 1; },
  toast: () => {},
  modal: () => {}, closeModal: () => {}, officialFetch: async () => ({ ok: true }),
  refreshOfficialLibrary: async () => false,
};
context.window = context;
context.globalThis = context;
const sandbox = vm.createContext(context);
vm.runInContext(runtimeSource, sandbox, { filename: 'homework-library-runtime.js' });
vm.runInContext(librarySource, sandbox, { filename: 'library.js' });

const initial = vm.runInContext('homeworkPage()', sandbox);
if (!initial.includes("setLibraryTab('all')") || !initial.includes('Tất cả (4)')) throw new Error('Thiếu tab Tất cả hoặc tổng số sai');
if (!initial.includes('Word A') || !initial.includes('PDF A') || !initial.includes('Legacy PDF') || !initial.includes('Audio A')) throw new Error('Tab Tất cả không hiển thị đủ định dạng');
if (!initial.includes('preload="none"')) throw new Error('Audio card vẫn preload metadata khi mở thư viện');

vm.runInContext("setLibraryTab('pdf')", sandbox);
if (context.db.libraryTab !== 'pdf') throw new Error('Không giữ tab PDF trong phiên');
if (renderCount !== 0) throw new Error('Đổi tab vẫn render lại toàn bộ app thay vì patch vùng Thư viện');
if (!tabButtons.find((b) => b.tab === 'pdf').active) throw new Error('Tab PDF không được đánh dấu active bằng patch cục bộ');
const pdfGrid = elements.get('libraryResultGrid').innerHTML;
if (!pdfGrid.includes('PDF A') || !pdfGrid.includes('Legacy PDF') || pdfGrid.includes('Word A') || pdfGrid.includes('Audio A')) throw new Error('Patch danh sách PDF phân loại sai');
if (elements.get('libraryResultCount').textContent !== '2 tài liệu') throw new Error('Số kết quả PDF không cập nhật cục bộ');

vm.runInContext("setLibraryTab('all')", sandbox);
if (!elements.get('libraryResultGrid').innerHTML.includes('Audio A')) throw new Error('Quay lại Tất cả không khôi phục đủ danh sách');
if (localStateWrites < 2) throw new Error('Trạng thái tab trong phiên không được cập nhật');

const allLevels = vm.runInContext("libraryFilterValues('level','all').join(',')", sandbox);
if (!allLevels.includes('G2') || !allLevels.includes('G5')) throw new Error('Bộ lọc Tất cả không lấy giá trị từ toàn bộ thư viện');

if (!appSource.includes("if(r==='homework'){db.libraryTab='all';db.libraryQ='';")) throw new Error('Mở lại tab Thư viện chưa reset toàn bộ bộ lọc');
if (!appSource.includes("db.libraryTab='all';") || !bootstrapSource.includes('libraryTab: "all"')) throw new Error('Reload chưa mặc định Tất cả');
if (!appSource.includes('MODULE_CACHE_LIBRARY_TTL_MS=24*60*60*1000')) throw new Error('Cache metadata Thư viện chưa được giữ dài hạn để hiển thị ngay');
if (!appSource.includes("String(cacheKey||'').startsWith('library:')")) throw new Error('Cache dài hạn chưa được giới hạn riêng cho Thư viện');
if (!warmupSource.includes("routes = ['homework', 'teachers'")) throw new Error('Smart warm-up chưa ưu tiên Thư viện');
if (!runtimeSource.includes('renderLibraryResultsDom') || !librarySource.includes('function renderLibraryResultsDom')) throw new Error('Chưa có partial render cho danh sách Thư viện');

console.log('Phase 8D.4.12 library All tab + fast loading smoke đạt.');
