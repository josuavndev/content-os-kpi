const GAS_URL = 'https://script.google.com/macros/s/AKfycbzH4JF301T4z4uZjWNk7PM1OBaJbJ1txds3byT3VtfZe0N5R0o1BhXT_EHFug13p3uF/exec';

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
