const GAS_URL = 'https://script.google.com/macros/s/AKfycbzH4JF301T4z4uZjWNk7PM1OBaJbJ1txds3byT3VtfZe0N5R0o1BhXT_EHFug13p3uF/exec';

const dataCache = new Map();
const dataInFlight = new Map();
const mutationVersion = new Map();
const DATA_CACHE_MS = 1000;

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
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  return '';
}

function normalizeDataset(data) {
  if (!data?.data || !Array.isArray(data.data.content)) return data;
  data.data.content = data.data.content.map(item => ({
    ...item,
    publish_date: normalizeDateKey(
      item.publish_date ?? item.publishDate ?? item.tanggal_publish ?? item.actual_publish_date ?? item.actualPublishDate
    )
  }));
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

function findOriginal(rows, savedContent) {
  const rowNumber = savedContent?.row_number || savedContent?.rowNumber || '';
  const contentId = getContentId(savedContent);
  return rows.find(item =>
    (rowNumber && String(getRowNumber(item)) === String(rowNumber)) ||
    (contentId && String(getContentId(item)) === String(contentId))
  );
}

function sameSavedShape(item, content) {
  const id = getContentId(content);
  if (id && String(getContentId(item)) === String(id)) return true;

  const title = String(item?.content_title || '').trim();
  const targetTitle = String(content?.content_title || '').trim();
  const creator = String(item?.creator_id || '').trim();
  const targetCreator = String(content?.creator_id || '').trim();
  const date = normalizeDateKey(item?.publish_date);
  const targetDate = normalizeDateKey(content?.publish_date);
  const type = String(item?.content_type || '').trim();
  const targetType = String(content?.content_type || '').trim();
  const platform = String(item?.platform || '').trim();
  const targetPlatform = String(content?.platform || '').trim();

  return Boolean(
    title && targetTitle && title === targetTitle &&
    (!targetCreator || creator === targetCreator) &&
    date && targetDate && date === targetDate &&
    (!targetType || type === targetType) &&
    (!targetPlatform || platform === targetPlatform)
  );
}

async function reconcileContentEdit(token, beforeData, savedContent) {
  const beforeRows = Array.isArray(beforeData?.data?.content) ? beforeData.data.content : [];
  const original = findOriginal(beforeRows, savedContent);
  if (!original) return;

  const originalRow = getRowNumber(original);
  if (!originalRow) return;
  const originalId = getContentId(original);

  const fresh = await fetchGas(JSON.stringify({ action: 'getData', token }));
  const rows = Array.isArray(fresh?.data?.content) ? fresh.data.content : [];
  const stillOld = rows.find(item => String(getRowNumber(item)) === String(originalRow));
  if (!stillOld) return; // Apps Script performed a true in-place update.

  const newRow = rows.find(item => {
    const row = String(getRowNumber(item));
    if (!row || row === String(originalRow)) return false;
    if (originalId && String(getContentId(item)) === String(originalId)) return true;
    return sameSavedShape(item, savedContent);
  });

  // Apps Script appears to append a replacement instead of updating the original row.
  // Delete only when a high-confidence replacement exists, so unrelated rows are safe.
  if (newRow) {
    await fetchGas(JSON.stringify({ action: 'deleteContent', token, row_number: originalRow }));
  } else {
    console.warn('Could not reconcile edited content row', { originalRow });
  }
}

function markMutation(token) {
  mutationVersion.set(token, (mutationVersion.get(token) || 0) + 1);
  dataCache.delete(token);
  dataInFlight.delete(token);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });

    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    let payload = {};
    try { payload = JSON.parse(body || '{}'); } catch (_) {}

    const token = payload.token || '';
    const isGetData = payload.action === 'getData' && token;

    if (isGetData) {
      const cached = dataCache.get(token);
      if (cached && Date.now() - cached.timestamp < DATA_CACHE_MS) return res.status(200).json(cached.data);

      const existing = dataInFlight.get(token);
      if (existing) {
        try { return res.status(200).json(await existing); }
        catch (error) { return res.status(502).json({ status: 'error', message: error.message || 'Google Apps Script error' }); }
      }

      const versionAtStart = mutationVersion.get(token) || 0;
      const request = fetchGas(body)
        .then(data => {
          if ((mutationVersion.get(token) || 0) === versionAtStart) dataCache.set(token, { data, timestamp: Date.now() });
          return data;
        })
        .finally(() => dataInFlight.delete(token));
      dataInFlight.set(token, request);
      try { return res.status(200).json(await request); }
      catch (error) { return res.status(502).json({ status: 'error', message: error.message || 'Google Apps Script error' }); }
    }

    if (!token) return res.status(401).json({ status: 'error', message: '401 Unauthorized: Token tidak ditemukan' });

    if (payload.action === 'saveContent' && payload.content) {
      let beforeData = null;
      try { beforeData = await fetchGas(JSON.stringify({ action: 'getData', token })); } catch (_) {}

      const content = payload.content;
      const savePayload = {
        action: 'saveContent',
        token,
        content,
        row_number: content.row_number || content.rowNumber || payload.row_number || payload.rowNumber || '',
        content_id: content.content_id || content.contentId || payload.content_id || payload.contentId || ''
      };

      const saved = await fetchGas(JSON.stringify(savePayload));

      try { await reconcileContentEdit(token, beforeData, content); }
      catch (reconcileError) { console.warn('Content edit reconciliation failed:', reconcileError); }

      markMutation(token);
      return res.status(200).json(saved);
    }

    if (payload.action === 'deleteContent') {
      let rowNumber = payload.row_number || payload.rowNumber || '';

      if (!rowNumber) {
        try {
          const current = await fetchGas(JSON.stringify({ action: 'getData', token }));
          const rows = Array.isArray(current?.data?.content) ? current.data.content : [];
          const targetId = payload.content_id || payload.contentId || '';
          const targetTitle = String(payload.content_title || '').trim();
          const targetDate = normalizeDateKey(payload.publish_date);
          const match = rows.find(item => {
            if (targetId && String(getContentId(item)) === String(targetId)) return true;
            return targetTitle && String(item?.content_title || '').trim() === targetTitle &&
              (!targetDate || normalizeDateKey(item?.publish_date) === targetDate);
          });
          rowNumber = getRowNumber(match);
        } catch (_) {}
      }

      if (!rowNumber) return res.status(400).json({ status: 'error', message: 'Baris Google Sheets untuk content ini tidak ditemukan.' });

      const deleted = await fetchGas(JSON.stringify({
        action: 'deleteContent', token, row_number: rowNumber,
        content_id: payload.content_id || payload.contentId || '',
        content_title: payload.content_title || '', publish_date: payload.publish_date || ''
      }));
      markMutation(token);
      return res.status(200).json(deleted);
    }

    const result = await fetchGas(body);
    markMutation(token);
    return res.status(200).json(result);
  } catch (error) {
    console.error('PROXY ERROR:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Proxy error' });
  }
}
