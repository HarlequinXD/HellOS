"""Render the HellOS launcher icon from the procedural pixel art (js/core/pixelart.js)
into the Android mipmap folders. Needs Python Playwright + Chrome/Chromium.

    python3 tools/export_launcher.py
"""
import asyncio, base64, os, subprocess, sys, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'app/src/main/assets/www')
RES = os.path.join(ROOT, 'app/src/main/res')
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

JS = """(d) => {
  // 108x108 adaptive foreground (logo inside the 66dp safe zone) and a 48x48 legacy icon
  const logo = new Image(); logo.src = PixelArt.get('boot', 'logo');
  return new Promise(res => logo.onload = () => {
    const out = {};
    for (const [name, k] of Object.entries(d)) {
      const fg = document.createElement('canvas'); fg.width = fg.height = Math.round(108 * k);
      const g = fg.getContext('2d'); g.imageSmoothingEnabled = false;
      const s = Math.round(72 * k); g.drawImage(logo, (fg.width - s) / 2, (fg.height - s) / 2 + 2 * k, s, s);
      const lg = document.createElement('canvas'); lg.width = lg.height = Math.round(48 * k);
      const h = lg.getContext('2d'); h.imageSmoothingEnabled = false;
      h.fillStyle = '#1a0710'; h.beginPath(); h.arc(lg.width / 2, lg.height / 2, lg.width / 2, 0, 7); h.fill();
      const t = Math.round(40 * k); h.drawImage(logo, (lg.width - t) / 2, (lg.height - t) / 2 + k, t, t);
      out[name] = [fg.toDataURL(), lg.toDataURL()];
    }
    res(out);
  });
}"""

async def main():
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8673', '--bind', '127.0.0.1'], cwd=WWW,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        async with async_playwright() as p:
            exe = os.environ.get('CHROME', '/usr/bin/google-chrome')
            b = await p.chromium.launch(executable_path=exe if os.path.exists(exe) else None, args=['--no-sandbox'])
            pg = await b.new_page()
            await pg.route('**/fonts.g*/**', lambda r: r.abort())
            await pg.goto('http://127.0.0.1:8673/index.html')
            await pg.wait_for_timeout(1500)
            out = await pg.evaluate(JS, DENS)
            for name, (fg, legacy) in out.items():
                d = os.path.join(RES, 'mipmap-' + name)
                os.makedirs(d, exist_ok=True)
                open(os.path.join(d, 'ic_hellos_fg.png'), 'wb').write(base64.b64decode(fg.split(',')[1]))
                open(os.path.join(d, 'ic_launcher.png'), 'wb').write(base64.b64decode(legacy.split(',')[1]))
                print('wrote', d)
            await b.close()
    finally:
        srv.terminate()

asyncio.run(main())
