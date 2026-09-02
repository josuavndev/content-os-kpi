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

    let response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body,
      redirect: 'manual'
    });

    console.log('FIRST STATUS:', response.status);
    console.log('FIRST LOCATION:', response.headers.get('location'));

    // Google Apps Script biasanya melakukan redirect.
    // Ikuti redirect secara manual agar POST tetap dipertahankan.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');

      if (!location) {
        return res.status(502).json({
          status: 'error',
          message: 'Google Apps Script melakukan redirect tanpa Location'
        });
      }

      response = await fetch(location, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body,
        redirect: 'follow'
      });

      console.log('REDIRECT STATUS:', response.status);
      console.log('REDIRECT URL:', response.url);
    }

    const text = await response.text();

    console.log('FINAL STATUS:', response.status);
    console.log('FINAL RESPONSE:', text.substring(0, 2000));

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      return res.status(502).json({
        status: 'error',
        message: 'Google Apps Script masih mengembalikan HTML, bukan JSON',
        gasStatus: response.status,
        gasUrl: response.url,
        gasResponse: text.substring(0, 1000)
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
