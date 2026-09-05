const SOURCE_URL = 'https://raw.githubusercontent.com/josuavndev/content-os-kpi/main/index.html';

const CALENDAR_COMPONENT = String.raw`    function ClayContentCalendar({ contentList, filterMonth, onSelectContent, onCreateNew }) {
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
          const [, day, month, year] = dmy;
          return \`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}\`;
        }
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
          return \`${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}\`;
        }
        return '';
      };

      const filtered = useMemo(() => {
        return contentList.filter(c => {
          const matchP = filterPlatform === 'ALL' || c.platform === filterPlatform;
          const matchT = filterType === 'ALL' || c.content_type === filterType;
          const title = String(c.content_title || '');
          const creator = String(c.creator_name || '');
          const q = search.toLowerCase();
          const matchS = !search || title.toLowerCase().includes(q) || creator.toLowerCase().includes(q);
          return matchP && matchT && matchS;
        });
      }, [contentList, filterPlatform, filterType, search]);

      const [year, month] = (filterMonth || '2026-09').split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const startOffset = new Date(year, month - 1, 1).getDay();
      const holidays = {
        '2026-01-01': 'Tahun Baru Masehi',
        '2026-01-16': 'Isra Mikraj Nabi Muhammad SAW',
        '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
        '2026-03-19': 'Hari Suci Nyepi 1948 Saka',
        '2026-03-21': 'Idul Fitri 1447 H',
        '2026-03-22': 'Idul Fitri 1447 H',
        '2026-04-03': 'Wafat Yesus Kristus',
        '2026-04-05': 'Paskah',
        '2026-05-01': 'Hari Buruh Internasional',
        '2026-05-14': 'Kenaikan Yesus Kristus',
        '2026-05-27': 'Idul Adha 1447 H',
        '2026-05-31': 'Hari Raya Waisak 2570 BE',
        '2026-06-01': 'Hari Lahir Pancasila',
        '2026-06-16': 'Tahun Baru Islam 1448 H',
        '2026-08-17': 'Proklamasi Kemerdekaan RI',
        '2026-08-25': 'Maulid Nabi Muhammad SAW',
        '2026-12-25': 'Kelahiran Yesus Kristus'
      };
      const cells = [];
      for (let i = 0; i < startOffset; i++) cells.push({ blank: true, key: \`b-${i}\` });
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = \`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}\`;
        cells.push({
          blank: false,
          day: d,
          dateStr: dStr,
          holiday: holidays[dStr],
          items: filtered.filter(c => normalizeDateKey(c.publish_date) === dStr),
          key: \`d-${d}\`
        });
      }

      return (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Shared Content Calendar</h2>
              <p className="text-xs text-slate-500 font-medium">Jadwal transparan tim untuk melihat slot publikasi.</p>
            </div>
            <button onClick={() => onCreateNew()} className="clay-btn bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-4 py-2.5 flex items-center space-x-1.5 self-start">
              <Icon.Plus /><span>Tambah Jadwal</span>
            </button>
          </div>
          <div className="clay-surface p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px] clay-inset px-3 py-2">
              <span className="text-slate-400"><Icon.Search /></span>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul konten atau creator..." className="w-full bg-transparent text-slate-800 font-medium focus:outline-none placeholder-slate-400" />
            </div>
            <div className="flex items-center space-x-2">
              <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} className="clay-inset px-3 py-2 text-slate-800 font-bold focus:outline-none cursor-pointer">
                <option value="ALL">Semua Platform</option><option value="Instagram">Instagram</option><option value="TikTok">TikTok</option><option value="YouTube Shorts">YouTube Shorts</option>
              </select>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="clay-inset px-3 py-2 text-slate-800 font-bold focus:outline-none cursor-pointer">
                <option value="ALL">Semua Format</option><option value="Reels">Reels</option><option value="Carousel">Carousel</option><option value="Story">Story</option><option value="Video">Video</option>
              </select>
            </div>
          </div>
          <div className="clay-surface p-4 overflow-hidden">
            <div className="grid grid-cols-7 text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-wider py-2 mb-2 border-b border-slate-200">
              <div>Min</div><div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((cell) => {
                if (cell.blank) return <div key={cell.key} className="min-h-[100px] opacity-20" />;
                return (
                  <div key={cell.key} onClick={() => onCreateNew(cell.dateStr)} className="min-h-[100px] clay-card p-2 hover:bg-indigo-50/50 cursor-pointer transition flex flex-col justify-between">
                    <div className="flex justify-between text-xs font-black text-slate-700"><span>{cell.day}</span>{cell.items.length > 0 && <span className="text-[9px] font-bold px-1.5 py-0.2 clay-pill bg-indigo-100 text-indigo-700">{cell.items.length}</span>}</div>
                    {cell.holiday && <div className="mt-1 p-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-extrabold leading-tight" title={cell.holiday}>🇮🇩 {cell.holiday}</div>}
                    <div className="space-y-1 overflow-y-auto max-h-[70px]">
                      {cell.items.map((item) => <div key={item.content_id} onClick={(e) => { e.stopPropagation(); onSelectContent(item); }} className={\`p-1 rounded-xl text-[9px] font-bold truncate border shadow-xs ${STATUS_BADGE[item.status]}\`} title={item.content_title}>{item.content_title}</div>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
`;

export default async function handler(req, res) {
  try {
    const response = await fetch(SOURCE_URL, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) return res.status(502).send('Failed to load Content OS source');
    let html = await response.text();

    const start = html.indexOf('    function ClayContentCalendar(');
    const end = html.indexOf('\nfunction ClayContentTable(', start);
    if (start < 0 || end < 0) return res.status(500).send('Calendar source anchors not found');
    html = html.slice(0, start) + CALENDAR_COMPONENT + html.slice(end);

    const invocationPattern = /(<ClayContentCalendar\s+contentList=\{contentList\})/;
    if (invocationPattern.test(html) && !/filterMonth=\{filterMonth\}/.test(html)) {
      html = html.replace(invocationPattern, '$1\n                  filterMonth={filterMonth}');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(html);
  } catch (error) {
    console.error(error);
    return res.status(500).send('Calendar wrapper error');
  }
}
