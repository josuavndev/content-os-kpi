const SOURCE_URL = 'https://raw.githubusercontent.com/josuavndev/content-os-kpi/main/index.html';

export const config = { matcher: ['/', '/index.html'] };

const HOLIDAYS_2026 = {
  '2026-01-01': 'Tahun Baru Masehi',
  '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-19': 'Hari Suci Nyepi',
  '2026-03-21': 'Idulfitri 1447 H',
  '2026-03-22': 'Idulfitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-04-05': 'Paskah',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-27': 'Iduladha 1447 H',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': 'Tahun Baru Islam 1448 H',
  '2026-08-17': 'Proklamasi Kemerdekaan RI',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Kelahiran Yesus Kristus'
};

const CALENDAR = `function ClayContentCalendar({ contentList, filterMonth, onSelectContent, onCreateNew, onMoveContent }) {
      const [filterPlatform, setFilterPlatform] = useState('ALL');
      const [filterType, setFilterType] = useState('ALL');
      const [search, setSearch] = useState('');

      const normalizeDateKey = (value) => {
        if (!value) return '';
        const raw = String(value).trim();
        if (!raw) return '';
        const iso = raw.match(/^(\\d{4}-\\d{2}-\\d{2})/);
        if (iso) return iso[1];
        const dmy = raw.match(/^(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})/);
        if (dmy) {
          const day = dmy[1], month = dmy[2], year = dmy[3];
          return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        }
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.getFullYear() + '-' + String(parsed.getMonth() + 1).padStart(2, '0') + '-' + String(parsed.getDate()).padStart(2, '0');
        }
        return '';
      };

      const filtered = useMemo(() => {
        return contentList.filter(c => {
          const date = normalizeDateKey(c.publish_date);
          const matchMonth = !filterMonth || date.startsWith(filterMonth);
          const matchP = filterPlatform === 'ALL' || c.platform === filterPlatform;
          const matchT = filterType === 'ALL' || c.content_type === filterType;
          const title = String(c.content_title || '');
          const creator = String(c.creator_name || '');
          const q = search.trim().toLowerCase();
          const matchS = !q || title.toLowerCase().includes(q) || creator.toLowerCase().includes(q);
          return matchMonth && matchP && matchT && matchS;
        });
      }, [contentList, filterMonth, filterPlatform, filterType, search]);

      const parts = String(filterMonth || '2026-09').split('-');
      const year = Number(parts[0]) || 2026;
      const month = Number(parts[1]) || 9;
      const daysInMonth = new Date(year, month, 0).getDate();
      const startOffset = new Date(year, month - 1, 1).getDay();
      const holidayMap = ${JSON.stringify(HOLIDAYS_2026)};
      const cells = [];
      for (let i = 0; i < startOffset; i++) cells.push({ blank: true, key: 'b-' + i });
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        cells.push({ blank: false, day: d, dateStr: dStr, holiday: holidayMap[dStr], items: filtered.filter(c => normalizeDateKey(c.publish_date) === dStr), key: 'd-' + d });
      }

      return (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Shared Content Calendar</h2>
              <p className="text-xs text-slate-500 font-medium">Jadwal transparan tim untuk melihat slot publikasi.</p>
            </div>
            <button onClick={() => onCreateNew()} className="clay-btn bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-2.5 flex items-center space-x-1.5 self-start"><Icon.Plus /><span>Tambah Jadwal</span></button>
          </div>
          <div className="clay-surface p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px] clay-inset px-3 py-2">
              <span className="text-slate-400"><Icon.Search /></span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul konten atau creator..." className="w-full bg-transparent text-slate-800 font-medium focus:outline-none placeholder-slate-400" />
            </div>
            <div className="flex items-center space-x-2">
              <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="clay-inset px-3 py-2 text-slate-800 font-bold focus:outline-none cursor-pointer"><option value="ALL">Semua Platform</option><option value="Instagram">Instagram</option><option value="TikTok">TikTok</option><option value="YouTube Shorts">YouTube Shorts</option></select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="clay-inset px-3 py-2 text-slate-800 font-bold focus:outline-none cursor-pointer"><option value="ALL">Semua Format</option><option value="Reels">Reels</option><option value="Carousel">Carousel</option><option value="Story">Story</option><option value="Video">Video</option></select>
            </div>
          </div>
          <div className="clay-surface p-4 overflow-hidden">
            <div className="grid grid-cols-7 text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-wider py-2 mb-2 border-b border-slate-200"><div>Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div></div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((cell) => {
                if (cell.blank) return <div key={cell.key} className="min-h-[100px] opacity-20" />;
                return (
                  <div key={cell.key} onClick={() => onCreateNew(cell.dateStr)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const row = e.dataTransfer.getData('content-row'); const item = contentList.find(c => String(c.row_number || c.rowNumber || '') === String(row)); if (item && onMoveContent) onMoveContent(item, cell.dateStr); }} className="min-h-[100px] clay-card p-2 hover:bg-indigo-50/50 cursor-pointer transition flex flex-col justify-between">
                    <div className="flex justify-between text-xs font-black text-slate-700"><span className={cell.holiday ? 'text-rose-600 font-black' : ''}>{cell.day}</span>{cell.items.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.2 clay-pill bg-indigo-100 text-indigo-700">{cell.items.length}</span>}</div>
                    {cell.holiday && <div className="mt-1 p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[8px] font-extrabold leading-tight" title={cell.holiday}>🇮🇩 {cell.holiday}</div>}
                    <div className="space-y-1 overflow-y-auto max-h-[70px]">
                      {cell.items.map((item) => <div key={item.content_id || item.row_number} draggable={true} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('content-row', String(item.row_number || item.rowNumber || '')); }} onClick={(e) => { e.stopPropagation(); onSelectContent(item); }} className={'p-1 rounded-xl text-[9px] font-bold truncate border shadow-xs ' + (STATUS_BADGE[item.status] || 'bg-slate-100 text-slate-700 border-slate-200')} title={item.content_title}>{item.content_title}</div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }`;

function replaceOnce(text, pattern, replacement, label) {
  const next = text.replace(pattern, replacement);
  if (next === text) console.warn('Content OS patch not applied:', label);
  return next;
}

export default async function middleware() {
  try {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) return new Response('Failed to load Content OS source', { status: 502 });
    let html = await response.text();

    const calendarStart = html.indexOf('    function ClayContentCalendar(');
    const calendarEnd = html.indexOf('\nfunction ClayContentTable(', calendarStart);
    if (calendarStart >= 0 && calendarEnd > calendarStart) {
      html = html.slice(0, calendarStart) + CALENDAR + html.slice(calendarEnd);
    } else {
      console.warn('Calendar anchors not found');
    }

    html = replaceOnce(html,
      "const [filterMonth, setFilterMonth] = useState('2026-09');",
      "const [filterMonth, setFilterMonth] = useState(() => localStorage.getItem('content_os_filter_month') || '2026-09');",
      'filterMonth state');

    html = replaceOnce(html,
      'onChange={(e) => setFilterMonth(e.target.value)}',
      "onChange={(e) => { const value = e.target.value; localStorage.setItem('content_os_filter_month', value); setFilterMonth(value); }}",
      'filterMonth persistence');

    html = replaceOnce(html,
      'const [contentList, setContentList] = useState([]);',
      "const [contentList, setContentList] = useState(() => { try { return JSON.parse(localStorage.getItem('content_os_content_cache') || '[]'); } catch (_) { return []; } });",
      'content cache state');

    html = replaceOnce(html,
      `const items = await backendService.getSharedCalendar(\n      currentUser,\n      { month: filterMonth }\n    );\n\n    setContentList(items);`,
      `const allData = await backendService._loadData();\n    const items = allData.content || [];\n    setContentList(items);\n    try { localStorage.setItem('content_os_content_cache', JSON.stringify(items)); } catch (_) {}`,
      'all-month refresh');

    html = replaceOnce(html,
      `setIsRestoringSession(false);\n      \nawait backendService._loadData();`,
      `setIsRestoringSession(false);\n      \nconst initialData = await backendService._loadData();\n      setContentList(initialData.content || []);\n      setUsers([...backendService.users]);\n      setConfig({ ...backendService.config });\n      if (backendService.lastSynced) setLastSyncTime(backendService.lastSynced.toLocaleTimeString());\n      try { localStorage.setItem('content_os_content_cache', JSON.stringify(initialData.content || [])); } catch (_) {}`,
      'session restore');

    html = replaceOnce(html,
      "content_id: content.content_id || content.contentId || ''",
      "content_id: content.content_id || content.contentId || '',\n  row_number: content.row_number || content.rowNumber || ''",
      'modal row identity');

    html = replaceOnce(html, 'onDelete(formData.content_id);', 'onDelete(formData);', 'modal delete payload');

    html = replaceOnce(html,
      /(<ClayContentCalendar\s+contentList=\{contentList\})/,
      `$1\n                  filterMonth={filterMonth}\n                  onMoveContent={async (item, newDate) => {\n                    if (!item || !newDate) return;\n                    const oldDate = String(item.publish_date || '').slice(0, 10);\n                    if (oldDate === newDate) return;\n                    const updated = { ...item, publish_date: newDate };\n                    const identity = item.row_number || item.rowNumber || item.content_id || item.contentId;\n                    setContentList(prev => prev.map(row => {\n                      const rowIdentity = row.row_number || row.rowNumber || row.content_id || row.contentId;\n                      return String(rowIdentity) === String(identity) ? updated : row;\n                    }));\n                    try {\n                      showToast('Memindahkan jadwal...', 'info');\n                      await backendService.saveContent(currentUser, updated);\n                      showToast('Jadwal berhasil dipindahkan!', 'success');\n                      await refreshData();\n                    } catch (err) {\n                      await refreshData();\n                      showToast(err.message || 'Gagal memindahkan jadwal', 'error');\n                    }\n                  }}`,
      'calendar props');

    html = replaceOnce(html,
      `onBulkDeleteMode={() => {\n  setIsContentModalOpen(false);\n  setBulkDeleteMode(true);\n}}\nonSave={(updated) => {`,
      `onBulkDeleteMode={() => {\n  setIsContentModalOpen(false);\n  setBulkDeleteMode(true);\n}}\nonDelete={async (contentToDelete) => {\n  const rowNumber = contentToDelete?.row_number || contentToDelete?.rowNumber;\n  if (!rowNumber) {\n    showToast('Baris Google Sheets untuk content ini tidak ditemukan.', 'error');\n    return;\n  }\n  showToast('Content sedang dihapus...', 'info');\n  try {\n    await backendService.deleteContent(currentUser, rowNumber);\n    setIsContentModalOpen(false);\n    setSelectedContent(null);\n    showToast('Content berhasil dihapus!', 'success');\n    await refreshData();\n  } catch (err) {\n    showToast(err.message || 'Gagal menghapus content', 'error');\n  }\n}}\nonSave={(updated) => {`,
      'modal delete handler');

    const saveStart = html.indexOf('onSave={(updated) => {', html.indexOf('<ClayContentModal'));
    if (saveStart >= 0) {
      const saveEnd = html.indexOf('\n            />', saveStart);
      if (saveEnd > saveStart) {
        const newSave = `onSave={async (updated) => {\n  setIsContentModalOpen(false);\n  showToast('Konten sedang disimpan...', 'info');\n\n  const rowNumber = updated?.row_number || updated?.rowNumber || '';\n  const contentId = updated?.content_id || updated?.contentId || (rowNumber ? 'row-' + rowNumber : 'temp-' + Date.now());\n  const optimisticContent = { ...updated, content_id: contentId, row_number: rowNumber };\n\n  flushSync(() => {\n    setContentList(prev => {\n      const existingIndex = prev.findIndex(item => {\n        const sameRow = rowNumber && String(item.row_number || item.rowNumber || '') === String(rowNumber);\n        const sameId = contentId && String(item.content_id || item.contentId || '') === String(contentId);\n        return sameRow || sameId;\n      });\n      if (existingIndex >= 0) {\n        const next = [...prev];\n        next[existingIndex] = optimisticContent;\n        return next;\n      }\n      return [optimisticContent, ...prev];\n    });\n  });\n\n  try {\n    await backendService.saveContent(currentUser, updated);\n    showToast('Konten berhasil disimpan & KPI diperbarui!', 'success');\n    await refreshData();\n  } catch (err) {\n    await refreshData();\n    showToast(err.message || 'Gagal menyimpan content', 'error');\n  }\n}}`;
        html = html.slice(0, saveStart) + newSave + html.slice(saveEnd);
      }
    }

    html = replaceOnce(html,
      `const { user } = await backendService.authenticate(email, password);\n    setCurrentUser(user);`,
      `const { user, token } = await backendService.authenticate(email, password);\n    localStorage.setItem('content_os_user', JSON.stringify({ ...user, token }));\n    setCurrentUser(user);`,
      'quick switch session');

    html = replaceOnce(html,
      `setTimeout(() => {\n          backendService.lastSynced = new Date();\n          refreshData();\n          setIsSyncing(false);\n          showToast('Berhasil sinkronisasi dengan database Google Sheets!', 'success');\n        }, 500);`,
      `setTimeout(async () => {\n          try {\n            backendService.lastSynced = new Date();\n            await refreshData();\n            showToast('Berhasil sinkronisasi dengan database Google Sheets!', 'success');\n          } catch (err) {\n            showToast(err.message || 'Sinkronisasi gagal', 'error');\n          } finally {\n            setIsSyncing(false);\n          }\n        }, 500);`,
      'manual sync');

    html = replaceOnce(html,
      `onSave={(newCfg) => {\n                    backendService.saveConfig(currentUser, newCfg);\n                    setConfig({ ...newCfg });\n                    refreshData();\n                    showToast('Pengaturan KPI tersimpan & terhitung ulang!', 'success');\n                  }}`,
      `onSave={async (newCfg) => {\n                    try {\n                      await backendService.saveConfig(currentUser, newCfg);\n                      setConfig({ ...newCfg });\n                      await refreshData();\n                      showToast('Pengaturan KPI tersimpan & terhitung ulang!', 'success');\n                    } catch (err) {\n                      showToast(err.message || 'Pengaturan KPI belum terhubung ke backend.', 'error');\n                    }\n                  }}`,
      'settings error handling');

    html = replaceOnce(html,
      `const [formData, setFormData] = useState({\n  ...content,\n  content_id: content.content_id || content.contentId || ''\n});`,
      `const [formData, setFormData] = useState({\n  ...content,\n  content_id: content.content_id || content.contentId || '',\n  row_number: content.row_number || content.rowNumber || ''\n});`,
      'modal form row identity');

    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error('Calendar middleware error:', error);
    return new Response('Calendar middleware error', { status: 500 });
  }
}
