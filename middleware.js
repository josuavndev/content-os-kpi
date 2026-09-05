const SOURCE_URL = 'https://raw.githubusercontent.com/josuavndev/content-os-kpi/main/index.html';

export const config = {
  matcher: ['/', '/index.html']
};

export default async function middleware() {
  try {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) return new Response('Failed to load Content OS source', { status: 502 });

    let html = await response.text();

    // Dynamic month calendar + Indonesian national holidays.
    html = html.replace(
      'function ClayContentCalendar({ contentList, onSelectContent, onCreateNew }) {',
      'function ClayContentCalendar({ contentList, filterMonth, setFilterMonth, onSelectContent, onCreateNew }) {'
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
      '2026-01-01': 'Tahun Baru 2026 Masehi',
      '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
      '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
      '2026-03-19': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
      '2026-03-21': 'Idulfitri 1447 H',
      '2026-03-22': 'Idulfitri 1447 H',
      '2026-04-03': 'Wafat Yesus Kristus',
      '2026-04-05': 'Kebangkitan Yesus Kristus (Paskah)',
      '2026-05-01': 'Hari Buruh Internasional',
      '2026-05-14': 'Kenaikan Yesus Kristus',
      '2026-05-27': 'Iduladha 1447 H',
      '2026-05-31': 'Hari Raya Waisak 2570 BE',
      '2026-06-01': 'Hari Lahir Pancasila',
      '2026-06-16': '1 Muharam Tahun Baru Islam 1448 H',
      '2026-08-17': 'Proklamasi Kemerdekaan RI',
      '2026-08-25': 'Maulid Nabi Muhammad SAW',
      '2026-12-25': 'Kelahiran Yesus Kristus'
    };

    html = html.replace(
      'const cells = [];',
      `const INDONESIA_PUBLIC_HOLIDAYS = ${JSON.stringify(holidayMap)};\n      const cells = [];`
    );
    html = html.replace(
      'items: filtered.filter(c => c.publish_date === dStr)',
      'holiday: INDONESIA_PUBLIC_HOLIDAYS[dStr], items: filtered.filter(c => c.publish_date === dStr)'
    );

    // Google Calendar-inspired visual system: flat grid, event chips, subtle borders.
    html = html.replace(
      '<div className="space-y-5">',
      `<div className="space-y-5">\n          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">\n            <div className="flex items-center gap-2">\n              <button type="button" onClick={() => { const d = new Date(year, month - 2, 1); setFilterMonth(\
                \`${'${'}d.getFullYear()}-${'${'}String(d.getMonth() + 1).padStart(2, '0')}\`\
              ); }} className="clay-btn bg-white px-3 py-2 text-slate-600 text-xs font-bold">←</button>\n              <button type="button" onClick={() => { const d = new Date(year, month, 1); setFilterMonth(\
                \`${'${'}d.getFullYear()}-${'${'}String(d.getMonth() + 1).padStart(2, '0')}\`\
              ); }} className="clay-btn bg-white px-3 py-2 text-slate-600 text-xs font-bold">→</button>\n              <button type="button" onClick={() => { const d = new Date(); setFilterMonth(\
                \`${'${'}d.getFullYear()}-${'${'}String(d.getMonth() + 1).padStart(2, '0')}\`\
              ); }} className="clay-btn bg-white px-3 py-2 text-xs font-bold text-indigo-600">Today</button>\n              <div className="ml-2 text-base font-extrabold text-slate-900">{new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>\n            </div>\n            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month View · Shared Team Calendar</div>\n          </div>`
    );

    html = html.replace(
      '<div className="clay-surface p-4 overflow-hidden">',
      '<div className="clay-surface p-0 overflow-hidden bg-white/90">'
    );
    html = html.replace(
      '<div className="grid grid-cols-7 text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-wider py-2 mb-2 border-b border-slate-200">',
      '<div className="grid grid-cols-7 text-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider py-3 border-b border-slate-200 bg-slate-50/80">'
    );
    html = html.replace(
      '<div className="grid grid-cols-7 gap-2">',
      '<div className="grid grid-cols-7 gap-0 border-l border-t border-slate-200">'
    );
    html = html.replace(
      'className="min-h-[100px] opacity-20"',
      'className="min-h-[118px] bg-slate-50/40 border-r border-b border-slate-200"'
    );
    html = html.replace(
      'className="min-h-[100px] clay-card p-2 hover:bg-indigo-50/50 cursor-pointer transition flex flex-col justify-between"',
      'className="min-h-[118px] bg-white p-2.5 hover:bg-indigo-50/40 cursor-pointer transition flex flex-col justify-between border-r border-b border-slate-200 rounded-none shadow-none"'
    );
    html = html.replace(
      '<div className="flex justify-between text-xs font-black text-slate-700">',
      '<div className="flex justify-between items-start text-xs font-black text-slate-700">'
    );
    html = html.replace(
      '<span>{cell.day}</span>',
      `<span className={cell.holiday ? 'text-rose-600' : 'text-slate-700'}>{cell.day}</span>`
    );
    html = html.replace(
      '<div className="space-y-1 overflow-y-auto max-h-[70px]">',
      `<div className="space-y-1 overflow-y-auto max-h-[82px]">\n                      {cell.holiday && (\n                        <div className="px-1.5 py-1 rounded-md bg-rose-50 text-rose-700 border-l-2 border-rose-500 text-[8px] font-extrabold leading-tight" title={cell.holiday}>\n                          🇮🇩 {cell.holiday}\n                        </div>\n                      )}`
    );
    html = html.replace(
      'className={`p-1 rounded-xl text-[9px] font-bold truncate border shadow-xs ${STATUS_BADGE[item.status]}`}',
      'className={`px-1.5 py-1 rounded-md text-[9px] font-bold truncate border-l-2 shadow-none ${STATUS_BADGE[item.status]}`}'
    );
    html = html.replace(
      '{item.content_title}',
      '{item.publish_time ? `${item.publish_time} · ` : \'\'}{item.content_title}'
    );

    // Pass month setter into the calendar toolbar without touching backend data flow.
    html = html.replace(
      '<ClayContentCalendar\n                  contentList={contentList}',
      '<ClayContentCalendar\n                  contentList={contentList}\n                  setFilterMonth={setFilterMonth}'
    );

    // Keep selected month persistent across refreshes.
    html = html.replace(
      "const [filterMonth, setFilterMonth] = useState('2026-09');",
      "const [filterMonth, setFilterMonth] = useState(() => localStorage.getItem('content_os_filter_month') || '2026-09');"
    );
    html = html.replace(
      'onChange={(e) => setFilterMonth(e.target.value)}',
      "onChange={(e) => { const value = e.target.value; localStorage.setItem('content_os_filter_month', value); setFilterMonth(value); }}"
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
