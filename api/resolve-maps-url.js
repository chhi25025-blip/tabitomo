export default async function handler(req, res) {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const targetUrl = urlObj.searchParams.get('url');
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const response = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja-JP,ja;q=0.9',
      },
    });

    const finalUrl = response.url;
    const htmlText = await response.text();

    let title = '';
    const titleMatch = htmlText.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/\s*-\s*Google\s*マップ.*/i, '')
        .replace(/\s*-\s*Google\s*Maps.*/i, '')
        .trim();
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({ finalUrl, title });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
