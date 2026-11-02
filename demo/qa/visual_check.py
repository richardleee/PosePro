"""Capture the actual responsive UI for visual review; no external services."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    errors = []
    page = browser.new_page(viewport={"width":393,"height":852}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:4173', wait_until='networkidle')
    page.wait_for_selector('.hero')
    page.screenshot(path=str(ROOT/'home-mobile.png'))
    print({'title':page.title(),'errors':errors,'overflow':page.evaluate('document.documentElement.scrollWidth > innerWidth')}, flush=True)
    page.locator('[data-action="start"]').click()
    page.locator('[data-action="sample-camera"]').click()
    page.screenshot(path=str(ROOT/'coach-mobile.png'))
    page.locator('[data-action="exit-coach"]').click()
    page.locator('[data-action="confirm-exit"]').click()
    page.locator('[data-action="look"][data-id="editorial"]').click()
    page.wait_for_timeout(450)
    page.screenshot(path=str(ROOT/'paywall-mobile.png'))
    page.locator('[data-action="close-modal"]').click()
    page.set_viewport_size({'width':1440,'height':1000})
    page.locator('#view').evaluate('(el) => el.scrollTop = 0')
    page.wait_for_timeout(250)
    page.screenshot(path=str(ROOT/'home-desktop.png'))
    browser.close()
