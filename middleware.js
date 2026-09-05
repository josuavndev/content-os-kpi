const SOURCE_URL = 'https://raw.githubusercontent.com/josuavndev/content-os-kpi/main/index.html';

export const config = {
  matcher: ['/', '/index.html']
};

export default async function middleware() {
  try {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) return new Response('Failed to load Content OS source', { status: 502 });

    let html = await response.text();

    html = html.replace(
      'function ClayContentCalendar({ contentList, onSelectContent, onCreateNew }) {',
      'function ClayContentCalendar({ contentList, filterMonth, onSelectContent, onCreateNew, onMoveContent }) {'
    );
    html = html.replace(
      'const daysInMonth = 30;\n      const startOffset = 2;',
      "const [year, month] = (filterMonth || '2026-09').split('-').map(Number);\n      const daysInMonth = new Date(year, month, 0).getDate();\n      const startOffset = new Date(year, month - 1, 1).getDay();"
    );
    html = html.replace(
      'const dStr = `2026-09-${String(d).padStart(2, \'0\')}`;',
      "const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;"
    );

    const holidayMap = {
      '2026-01-01': 'Tahun Baru Masehi', '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
      '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili', '2026-03-19': 'Hari Suci Nyepi',
      '2026-03-21': 'Idulfitri 1447 H', '2026-03-22': 'Idulfitri 1447 H',
      '2026-04-03': 'Wafat Yesus Kristus', '2026-04-05': 'Paskah',
      '2026-05-01': 'Hari Buruh Internasional', '2026-05-14': 'Kenaikan Yesus Kristus',
      '2026-05-27': 'Iduladha 1447 H', '2026-05-31': 'Hari Raya Waisak 2570 BE',
      '2026-06-01': 'Hari Lahir Pancasila', '2026-06-16': 'Tahun Baru Islam 1448 H',
      '2026-08-17': 'Proklamasi Kemerdekaan RI', '2026-08-25': 'Maulid Nabi Muhammad SAW',
      '2026-12-25': 'Kelahiran Yesus Kristus'
    };

    html = html.replace(
      'const cells = [];',
      `const INDONESIA_PUBLIC_HOLIDAYS = ${JSON.stringify(holidayMap)};\n      const cells = [];`
    );

    html = html.replace(
      '<span>{cell.day}</span>',
      `<span className="flex flex-col min-w-0 h-full">\n                        <span className={INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr] ? 'text-rose-600 font-black' : ''}>{cell.day}</span>\n                        {INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr] && (\n                          <span className="mt-1.5 relative overflow-hidden rounded-lg border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-rose-50 px-2 py-1.5 text-rose-700 shadow-sm" title={INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr]}>\n                            <span className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-rose-100/70"></span>\n                            <span className="relative flex items-center gap-1.5 min-w-0">\n                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border border-rose-100 text-[10px] shadow-sm">🇮🇩</span>\n                              <span className="min-w-0">\n                                <span className="block text-[7px] font-black uppercase tracking-[0.12em] text-rose-400">Libur Nasional</span>\n                                <span className="block text-[8px] leading-tight font-extrabold truncate">{INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr]}</span>\n                              </span>\n                            </span>\n                          </span>\n                        )}\n                      </span>`
    );

    // Calendar event pills can be dragged onto another date.
    html = html.replace(
      'onClick={() => onCreateNew(cell.dateStr)}',
      "onClick={() => onCreateNew(cell.dateStr)}\n                  onDragOver={(e) => e.preventDefault()}\n                  onDrop={(e) => { e.preventDefault(); const rowNumber = e.dataTransfer.getData('content-row'); const item = contentList.find(c => String(c.row_number || c.rowNumber || '') === String(rowNumber)); if (item && onMoveContent) onMoveContent(item, cell.dateStr); }}"
    );
    html = html.replace(
      'key={item.content_id}\n                        onClick={(e) => { e.stopPropagation(); onSelectContent(item); }}',
      "key={item.content_id || item.row_number}\n                        draggable={true}\n                        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('content-row', String(item.row_number || item.rowNumber || '')); }}\n                        onClick={(e) => { e.stopPropagation(); onSelectContent(item); }}"
    );

    html = html.replace(
      /(<ClayContentCalendar\s+contentList=\{contentList\})/, 
      `$1\n                  filterMonth={filterMonth}\n                  onMoveContent={async (item, newDate) => {\n                    if (!item || !newDate || String(item.publish_date || '') === String(newDate)) return;\n                    const updated = { ...item, publish_date: newDate };\n                    const key = item.row_number || item.rowNumber || item.content_id || item.contentId;\n                    setContentList(prev => prev.map(row => {\n                      const rowKey = row.row_number || row.rowNumber || row.content_id || row.contentId;\n                      return String(rowKey) === String(key) ? updated : row;\n                    }));\n                    try {\n                      showToast('Memindahkan jadwal...', 'info');\n                      await backendService.saveContent(currentUser, updated);\n                      showToast('Jadwal berhasil dipindahkan!', 'success');\n                      await refreshData();\n                    } catch (err) {\n                      showToast(err.message || 'Gagal memindahkan jadwal', 'error');\n                      await refreshData();\n                    }\n                  }}`
    );

    html = html.replace(
      "const [filterMonth, setFilterMonth] = useState('2026-09');",
      "const [filterMonth, setFilterMonth] = useState(() => localStorage.getItem('content_os_filter_month') || '2026-09');"
    );
    html = html.replace(
      'onChange={(e) => setFilterMonth(e.target.value)}',
      "onChange={(e) => { const value = e.target.value; localStorage.setItem('content_os_filter_month', value); setFilterMonth(value); }}"
    );

    html = html.replace(
      'const [contentList, setContentList] = useState([]);',
      "const [contentList, setContentList] = useState(() => { try { return JSON.parse(localStorage.getItem('content_os_content_cache') || '[]'); } catch (_) { return []; } });"
    );

    html = html.replace(
      'setContentList(items);\n    setUsers([...backendService.users]);',
      "setContentList(items);\n    try { localStorage.setItem('content_os_content_cache', JSON.stringify(items)); } catch (_) {}\n    setUsers([...backendService.users]);"
    );

    html = html.replace(
      'await backendService._loadData();',
      `const initialData = await backendService._loadData();\n      setContentList(initialData.content || []);\n      try { localStorage.setItem('content_os_content_cache', JSON.stringify(initialData.content || [])); } catch (_) {}\n      setUsers([...backendService.users]);\n      setConfig({ ...backendService.config });\n      if (backendService.lastSynced) setLastSyncTime(backendService.lastSynced.toLocaleTimeString());`
    );

    html = html.replace(
      "content_id: content.content_id || content.contentId || ''",
      "content_id: content.content_id || content.contentId || '',\n  row_number: content.row_number || content.rowNumber || ''"
    );

    html = html.replace(
      'onDelete(formData.content_id);',
      'onDelete(formData);'
    );

    html = html.replace(
      `onBulkDeleteMode={() => {\n  setIsContentModalOpen(false);\n  setBulkDeleteMode(true);\n}}\nonSave={(updated) => {`,
      `onBulkDeleteMode={() => {\n  setIsContentModalOpen(false);\n  setBulkDeleteMode(true);\n}}\nonDelete={async (contentToDelete) => {\n  const rowNumber = contentToDelete?.row_number || contentToDelete?.rowNumber;\n  if (!rowNumber) {\n    showToast('Row Google Sheets tidak ditemukan untuk content ini.', 'error');\n    return;\n  }\n  showToast('Content sedang dihapus...', 'info');\n  try {\n    await backendService.deleteContent(currentUser, rowNumber);\n    setIsContentModalOpen(false);\n    setSelectedContent(null);\n    showToast('Content berhasil dihapus!', 'success');\n    await refreshData();\n  } catch (err) {\n    showToast(err.message || 'Gagal menghapus content', 'error');\n  }\n}}\nonSave={(updated) => {`
    );

    // Preserve the original sheet row and compare against its persisted date BEFORE saving.
    // This converts the append-style Apps Script save into a true MOVE for date edits.
    html = html.replace(
      `async saveContent(currentUser, contentData) {\n  \n  this._authorize(currentUser);\n\n  const data = await this._post({\n    action: 'saveContent',\n    content: contentData\n  });`,
      `async saveContent(currentUser, contentData) {\n  \n  this._authorize(currentUser);\n\n  const originalRowNumber = contentData?.row_number || contentData?.rowNumber || '';\n  const originalContentId = contentData?.content_id || contentData?.contentId || '';\n  const originalTitle = String(contentData?.content_title || '').trim();\n  const originalCreatorId = contentData?.creator_id || '';\n  let beforeRows = [];\n\n  if (originalRowNumber) {\n    try {\n      const before = await this._post({ action: 'getData' });\n      beforeRows = Array.isArray(before?.data?.content) ? before.data.content : [];\n    } catch (_) {}\n  }\n\n  const originalRow = beforeRows.find(item => String(item?.row_number || item?.rowNumber || '') === String(originalRowNumber));\n  const originalDate = String(originalRow?.publish_date || '');\n\n  const data = await this._post({\n    action: 'saveContent',\n    content: contentData\n  });`
    );

    html = html.replace(
      `  if (data.status !== 'ok') {\n    throw new Error(\n      data.message || 'Gagal menyimpan content'\n    );\n  }\n\n  return data;\n}`,
      `  if (data.status !== 'ok') {\n    throw new Error(\n      data.message || 'Gagal menyimpan content'\n    );\n  }\n\n  const targetDate = String(contentData?.publish_date || '');\n  if (originalRowNumber && originalDate && originalDate !== targetDate) {\n    try {\n      const after = await this._post({ action: 'getData' });\n      const rows = Array.isArray(after?.data?.content) ? after.data.content : [];\n      const newRow = rows.find(item => {\n        const row = String(item?.row_number || item?.rowNumber || '');\n        if (row === String(originalRowNumber)) return false;\n        const idMatch = originalContentId && String(item?.content_id || item?.contentId || '') === String(originalContentId);\n        const titleMatch = originalTitle && String(item?.content_title || '').trim() === originalTitle;\n        const creatorMatch = !originalCreatorId || String(item?.creator_id || '') === String(originalCreatorId);\n        return (idMatch || titleMatch) && creatorMatch && String(item?.publish_date || '') === targetDate;\n      });\n\n      if (newRow) {\n        await this._post({ action: 'deleteContent', row_number: originalRowNumber });\n      }\n    } catch (reconcileError) {\n      console.warn('Content move reconciliation failed:', reconcileError);\n    }\n  }\n\n  return data;\n}`
    );

    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error(error);
    return new Response('Calendar middleware error', { status: 500 });
  }
}
