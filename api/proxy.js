const GAS_URL = 'https://script.google.com/macros/s/AKfycbzH4JF301T4z4uZjWNk7PM1OBaJbJ1txds3byT3VtfZe0N5R0o1BhXT_EHFug13p3uF/exec';

// Reuse the same in-flight/very-short-lived getData result so the dashboard,
// calendar and KPI effects do not fan out into multiple Apps Script reads.
const dataCache = new Map();
const dataInFlight = new Map();
const DATA_CACHE_MS = 1500;

function normalizeDateKey(value) {
  if (!value) return '';
  const raw = String(value).trim();
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

  return raw;
}

function normalizeDataset(data) {
  if (!data || !data.data || !Array.isArray(data.data.content)) return data;

  data.data.content = data.data.content.map(item => ({
    ...item,
    publish_date: normalizeDateKey(item.publish_date)
  }));

  return data;
}

async function fetchGas(body) {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body,
    redirect: 'follow'
  });

  const text = await response.text();

  if (!response.ok) {
    console.error('GAS ERROR:', response.status, text.substring(0, 1000));
    throw new Error(`Google Apps Script error ${response.status}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.error('GAS NON-JSON RESPONSE:', text.substring(0, 1000));
    throw new Error('Google Apps Script masih mengembalikan HTML, bukan JSON');
  }

  return normalizeDataset(data);
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        status: 'error',
        message: 'Method not allowed'
      });
    }

    const body =
      typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body || {});

    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch (_) {
      payload = {};
    }

    const token = payload.token || '';
    const isGetData = payload.action === 'getData' && token;

    if (!isGetData && token) {
      dataCache.delete(token);
    }

    if (isGetData) {
      const cached = dataCache.get(token);
      if (cached && Date.now() - cached.timestamp < DATA_CACHE_MS) {
        return res.status(200).json(cached.data);
      }

      const existing = dataInFlight.get(token);
      if (existing) {
        const data = await existing;
        return res.status(200).json(data);
      }

      const request = fetchGas(body)
        .then(data => {
          dataCache.set(token, { data, timestamp: Date.now() });
          return data;
        })
        .finally(() => {
          dataInFlight.delete(token);
        });

      dataInFlight.set(token, request);

      try {
        const data = await request;
        return res.status(200).json(data);
      } catch (error) {
        return res.status(502).json({
          status: 'error',
          message: error.message || 'Google Apps Script error'
        });
      }
    }

    const data = await fetchGas(body);
    return res.status(200).json(data);

  } catch (error) {
    console.error('PROXY ERROR:', error);

    return res.status(500).json({
      status: 'error',
      message: error.message || 'Proxy error'
    });
  }
}
