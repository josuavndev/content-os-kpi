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

    // Official Indonesian national public holidays for 2026.
    // Source: SKB 3 Menteri No. 1497/2025, No. 2/2025, No. 5/2025.
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

    // Show a compact holiday marker inside the relevant date cell.
    html = html.replace(
      '<span>{cell.day}</span>',
      `<span className="flex flex-col min-w-0">\n                        <span>{cell.day}</span>\n                        {INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr] && (\n                          <span className="mt-1 text-[8px] leading-tight font-extrabold text-rose-600 truncate" title={INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr]}>🇮🇩 {INDONESIA_PUBLIC_HOLIDAYS[cell.dateStr]}</span>\n                        )}\n                      </span>`
    );

    // Inject the selected month into the actual calendar invocation.
    html = html.replace(
      /(<ClayContentCalendar\s+contentList=\{contentList\})/,
      '$1\n                  filterMonth={filterMonth}'
    );

    // Persist the selected month so a refresh does not silently jump back to September.
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
