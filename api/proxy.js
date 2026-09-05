const GAS_URL = 'https://script.google.com/macros/s/AKfycbzH4JF301T4z4uZjWNk7PM1OBaJbJ1txds3byT3VtfZe0N5R0o1BhXT_EHFug13p3uF/exec';

const dataCache = new Map();
const dataInFlight = new Map();
const DATA_CACHE_MS = 1500;

function normalizeDateKey(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
  }
  return '';
}

function normalizeDataset(data) {
  if (!data || !data.data || !Array.isArray(data.data.content)) return data;
  data.data.content = data.data.content.map(item => {
    const publishValue = item.publish_date ?? item.publishDate ?? item.tanggal_publish ?? item.actual_publish_date ?? item.actualPublishDate;
    return { ...item, publish_date: normalizeDateKey(publishValue) };
  });
  return data;
}

async function fetchGas(body) {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body,
    redirect: 'follow'
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Google Apps Script error ${response.status}`);
  let data;
  try { data = JSON.parse(text); }
  catch (_) { throw new Error('Google Apps Script masih mengembalikan HTML, bukan JSON'); }
  return normalizeDataset(data);
}

function getRowNumber(item) {
  return item?.row_number ?? item?.rowNumber ?? item?.sheet_row ?? item?.sheetRow ?? '';
}

function getContentId(item) {
  return item?.content_id ?? item?.contentId ?? '';
}

function sameId(a, b) {
  const x = getContentId(a);
  const y = getContentId(b);
  return x && y && String(x) === String(y);
}

function sameRow(a, b) {
  const x = getRowNumber(a);
  const y = getRowNumber(b);
  return x && y && String(x) === String(y);
}

function matchesSavedContent(item, content) {
  const idMatch = content?.content_id && String(getContentId(item)) === String(content.content_id);
  const titleMatch = String(item?.content_title || '').trim() === String(content?.content_title || '').trim();
  const creatorMatch = !content?.creator_id || String(item?.creator_id || '') === String(content.creator_id);
  const dateMatch = normalizeDateKey(item?.publish_date) === normalizeDateKey(content?.publish_date);
  return (idMatch || titleMatch) && creatorMatch && dateMatch;
}

async function reconcileContentEdit(token, beforeData, savedContent) {
  const beforeRows = Array.isArray(beforeData?.data?.content) ? beforeData.data.content : [];
  const original = beforeRows.find(item =>
    sameId(item, savedContent) ||
    (savedContent?.row_number && String(getRowNumber(item)) === String(savedContent.row_number))
  );

  if (!original) return;
  const originalRow = getRowNumber(original);
  if (!originalRow) return;

  const fresh = await fetchGas(JSON.stringify({ action: 'getData', token }));
  const rows = Array.isArray(fresh?.data?.content) ? fresh.data.content : [];
  const stillOld = rows.find(item => String(getRowNumber(item)) === String(originalRow));
  if (!stillOld) return;

  const newRow = rows.find(item => {
    if (String(getRowNumber(item)) === String(originalRow)) return false;
    return matchesSavedContent(item, savedContent);
  });

  if (newRow && normalizeDateKey(stillOld.publish_date) !== normalizeDateKey(savedContent.publish_date)) {
    await fetchGas(JSON.stringify({ action: 'deleteContent', token, row_number: originalRow }));
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch (_) {}

    const token = payload.token || '';
    const isGetData = payload.action === 'getData' && token;

    if (!isGetData && token) dataCache.delete(token);

    if (isGetData) {
      const cached = dataCache.get(token);
      if (cached && Date.now() - cached.timestamp < DATA_CACHE_MS) return res.status(200).json(cached.data);

      const existing = dataInFlight.get(token);
      if (existing) return res.status(200).json(await existing);

      const request = fetchGas(body)
        .then(data => { dataCache.set(token, { data, timestamp: Date.now() }); return data; })
        .finally(() => dataInFlight.delete(token));
      dataInFlight.set(token, request);
      try { return res.status(200).json(await request); }
      catch (error) { return res.status(502).json({ status: 'error', message: error.message || 'Google Apps Script error' }); }
    }

    // Apps Script's saveContent implementation may append a new row instead of updating
    // an existing one. Reconcile that case here so an edit remains one logical content item.
    if (payload.action === 'saveContent' && token && payload.content) {
      let beforeData = null;
      try { beforeData = await fetchGas(JSON.stringify({ action: 'getData', token })); } catch (_) {}

      const saved = await fetchGas(body);

      try {
        await reconcileContentEdit(token, beforeData, payload.content);
      } catch (reconcileError) {
        console.warn('Content edit reconciliation failed:', reconcileError);
      }

      return res.status(200).json(saved);
    }

    return res.status(200).json(await fetchGas(body));
  } catch (error) {
    console.error('PROXY ERROR:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Proxy error' });
  }
}