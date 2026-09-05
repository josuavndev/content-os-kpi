const GAS_URL = 'https://script.google.com/macros/s/AKfycbzH4JF301T4z4uZjWNk7PM1OBaJbJ1txds3byT3VtfZe0N5R0o1BhXT_EHFug13p3uF/exec';

// Reuse the same in-flight/very-short-lived getData result so the dashboard,
// calendar and KPI effects do not fan out into multiple Apps Script reads.
const dataCache = new Map();
const dataInFlight = new Map();
const DATA_CACHE_MS = 1500;

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
      // Any mutation invalidates the short-lived cached dataset for this session.
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

      const request = fetch(GAS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body,
        redirect: 'follow'
      }).then(async response => {
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

        dataCache.set(token, { data, timestamp: Date.now() });
        return data;
      }).finally(() => {
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
      return res.status(502).json({
        status: 'error',
        message: `Google Apps Script error ${response.status}`
      });
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error('GAS NON-JSON RESPONSE:', text.substring(0, 1000));
      return res.status(502).json({
        status: 'error',
        message: 'Google Apps Script masih mengembalikan HTML, bukan JSON'
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('PROXY ERROR:', error);

    return res.status(500).json({
      status: 'error',
      message: error.message || 'Proxy error'
    });
  }
}
