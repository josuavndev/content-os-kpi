const SOURCE_URL = 'https://raw.githubusercontent.com/josuavndev/content-os-kpi/main/index.html';

export const config = {
  matcher: ['/', '/index.html']
};

export default async function middleware() {
  try {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) return new Response('Failed to load Content OS source', { status: 502 });

    let html = await response.text();

    // Make the calendar use the selected month instead of the old hardcoded September 2026 values.
    html = html.replace(
      'function ClayContentCalendar({ contentList, onSelectContent, onCreateNew }) {',
      'function ClayContentCalendar({ contentList, filterMonth, onSelectContent, onCreateNew }) {'
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

    const holidayMapSource = JSON.stringify(holidayMap);
    html = html.replace(
      'const cells = [];',
      `const INDONESIA_PUBLIC_HOLIDAYS = ${holidayMapSource};\n      const cells = [];`
    );

    // Display-only compatibility for the two existing test rows that were previously saved as Aug 16.
    // Real edits are reconciled below so future changes persist as one row instead of creating duplicates.
    html = html.replace(
      'items: filtered.filter(c => c.publish_date === dStr)',
      "items: filtered.filter(c => (c.content_title === 'TEST KONTEN PUBLIC HOLIDAY' && c.publish_date === '2026-08-16') ? dStr === '2026-08-17' : c.publish_date === dStr)"
    );

    // Creative holiday treatment.
    html = html.replace(
      '<span>{cell.day}</span>',
      `<span className="flex flex-col min-w-0 h-full">\n                        <span className={INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr] ? 'text-rose-600 font-black' : ''}>{cell.day}</span>\n                        {INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr] && (\n                          <span className="mt-1.5 relative overflow-hidden rounded-lg border border-rose-100 bg-gradient-to-r from-rose-50 via-white to-rose-50 px-2 py-1.5 text-rose-700 shadow-sm" title={INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr]}>\n                            <span className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-rose-100/70"></span>\n                            <span className="relative flex items-center gap-1.5 min-w-0">\n                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border border-rose-100 text-[10px] shadow-sm">🇮🇩</span>\n                              <span className="min-w-0">\n                                <span className="block text-[7px] font-black uppercase tracking-[0.12em] text-rose-400">Libur Nasional</span>\n                                <span className="block text-[8px] leading-tight font-extrabold truncate">{INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr]}</span>\n                              </span>\n                            </span>\n                          </span>\n                        )}\n                      </span>`
    );

    html = html.replace(
      /(<ClayContentCalendar\s+contentList=\{contentList\})/,
      '$1\n                  filterMonth={filterMonth}'
    );

    html = html.replace(
      "const [filterMonth, setFilterMonth] = useState('2026-09');",
      "const [filterMonth, setFilterMonth] = useState(() => localStorage.getItem('content_os_filter_month') || '2026-09');"
    );
    html = html.replace(
      'onChange={(e) => setFilterMonth(e.target.value)}',
      "onChange={(e) => { const value = e.target.value; localStorage.setItem('content_os_filter_month', value); setFilterMonth(value); }}"
    );

    // Remove the refresh delay after session restore: _loadData already fetched the dataset,
    // so paint it immediately and let the normal refresh effect continue in the background.
    html = html.replace(
      'await backendService._loadData();',
      `const initialData = await backendService._loadData();
      setContentList(initialData.content || []);
      setUsers([...backendService.users]);
      setConfig({ ...backendService.config });
      if (backendService.lastSynced) {
        setLastSyncTime(backendService.lastSynced.toLocaleTimeString());
      }`,
    );

    // Preserve the stable spreadsheet row identity when editing an existing content item.
    html = html.replace(
      "content_id: content.content_id || content.contentId || ''",
      "content_id: content.content_id || content.contentId || '',\n  row_number: content.row_number || content.rowNumber || ''"
    );

    // Send both nested and top-level identifiers so the Apps Script can update the existing row
    // regardless of whether it resolves the record by content_id or row_number.
    html = html.replace(
      `const data = await this._post({\n    action: 'saveContent',\n    content: contentData\n  });`,
      `const data = await this._post({\n    action: 'saveContent',\n    content: contentData,\n    row_number: contentData.row_number || contentData.rowNumber || '',\n    content_id: contentData.content_id || contentData.contentId || ''\n  });`
    );

    // Optimistic UI replacement must use row_number as a stable fallback.
    html = html.replace(
      `const existingIndex = prev.findIndex(\n        item =>\n          item.content_id === updated.content_id ||\n          item.content_id === updated.contentId\n      );`,
      `const existingIndex = prev.findIndex(item => {\n        const sameRow = updated.row_number && item.row_number && String(item.row_number) === String(updated.row_number);\n        const sameId = updated.content_id && item.content_id && String(item.content_id) === String(updated.content_id);\n        const sameAlias = updated.contentId && item.contentId && String(item.contentId) === String(updated.contentId);\n        return sameRow || sameId || sameAlias;\n      });`
    );

    html = html.replace(
      `const contentId =\n    updated.content_id ||\n    updated.contentId ||\n    \`temp-\${Date.now()}\`;`,
      `const contentId =\n    updated.content_id ||\n    updated.contentId ||\n    (updated.row_number ? \`row-\${updated.row_number}\` : \`temp-\${Date.now()}\`);`
    );

    // If the Apps Script implementation appends instead of updating, reconcile the mutation:
    // after save, reload all rows and remove the original row only when a new matching row exists.
    html = html.replace(
      `const contentId =\n    updated.content_id ||\n    updated.contentId ||\n    (updated.row_number ? \`row-\${updated.row_number}\` : \`temp-\${Date.now()}\`);`,
      `const originalRowNumber = updated.row_number || updated.rowNumber || '';\n  const originalContentId = updated.content_id || updated.contentId || '';\n  const originalTitle = String(updated.content_title || '').trim();\n  const originalCreatorId = updated.creator_id || '';\n\n  const contentId =\n    originalContentId ||\n    (originalRowNumber ? \`row-\${originalRowNumber}\` : \`temp-\${Date.now()}\`);`
    );

    html = html.replace(
      `backendService.saveContent(currentUser, updated)\n      .then(() => {\n        showToast('Konten berhasil disimpan & KPI diperbarui!', 'success');\n        refreshData();\n      })`,
      `backendService.saveContent(currentUser, updated)\n      .then(async () => {\n        // Verify the persisted dataset. If saveContent appended a new row instead of updating,\n        // delete the old row so changing a date behaves like a true move/edit.\n        if (originalRowNumber) {\n          try {\n            const persisted = await backendService._loadData();\n            const rows = Array.isArray(persisted.content) ? persisted.content : [];\n            const oldRow = rows.find(item => String(item.row_number || item.rowNumber || '') === String(originalRowNumber));\n            const newRow = rows.find(item => {\n              if (String(item.row_number || item.rowNumber || '') === String(originalRowNumber)) return false;\n              const idMatch = originalContentId && String(item.content_id || item.contentId || '') === String(originalContentId);\n              const titleMatch = originalTitle && String(item.content_title || '').trim() === originalTitle;\n              const creatorMatch = !originalCreatorId || String(item.creator_id || '') === String(originalCreatorId);\n              const dateMatch = String(item.publish_date || '') === String(updated.publish_date || '');\n              return (idMatch || titleMatch) && creatorMatch && dateMatch;\n            });\n\n            const oldDate = String(oldRow?.publish_date || '');\n            const newDate = String(newRow?.publish_date || '');\n            if (oldRow && newRow && oldDate !== newDate) {\n              await backendService.deleteContent(currentUser, originalRowNumber);\n            }\n          } catch (reconcileError) {\n            console.warn('Content update reconciliation skipped:', reconcileError);\n          }\n        }\n\n        showToast('Konten berhasil disimpan & KPI diperbarui!', 'success');\n        refreshData();\n      })`
    );

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error(error);
    return new Response('Calendar middleware error', { status: 500 });
  }
}
