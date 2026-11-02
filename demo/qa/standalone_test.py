"""Validate the delivered single HTML, including fully offline asset loading."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

QA=Path(__file__).resolve().parent
TARGET=QA.parent.parent/'MusePilot_Demo.html'

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':393,'height':852},device_scale_factor=1,is_mobile=True,has_touch=True)
    context.set_offline(True)
    page=context.new_page()
    def shot(name):
        page.wait_for_timeout(380)
        page.screenshot(path=str(QA/name))
    errors=[]; requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    page.goto(TARGET.as_uri())
    page.wait_for_selector('.hero')
    page.wait_for_function('Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)')
    assert page.locator('.hero img').evaluate('(el)=>el.src.startsWith("data:image/webp") && el.complete && el.naturalWidth===1024')
    for w,h in [(320,740),(393,852),(430,932),(1440,1000)]:
        page.set_viewport_size({'width':w,'height':h})
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'), f'overflow {w}'
    page.set_viewport_size({'width':393,'height':852})
    shot('standalone-home.png')
    page.locator('[data-action="look"][data-id="editorial"]').click()
    page.wait_for_timeout(400)
    assert '7-day' in page.locator('.modal-sheet[role="dialog"]').inner_text()
    assert page.locator('.paywall-art img').evaluate('(el)=>el.src.startsWith("data:") && el.naturalWidth>0')
    targets=page.locator('.modal-sheet[role="dialog"] button').evaluate_all('(els)=>els.map(el=>({action:el.dataset.action,w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})).filter(x=>x.w<43.5||x.h<43.5)')
    assert not targets, f'small modal targets {targets}'
    shot('standalone-paywall.png')
    page.locator('[data-action="close-modal"]').click()
    page.locator('[data-action="mode"][data-id="shooting"]').click()
    page.locator('[data-action="start"]').click()
    page.locator('[data-action="sample-camera"]').click()
    page.wait_for_timeout(200)
    assert 'Keep their shoulders' in page.locator('.instruction').inner_text()
    shot('standalone-coach.png')
    for _ in range(4):
        page.locator('[data-action="next-step"]').click()
        page.wait_for_timeout(520)
    page.locator('[data-action="shutter"]').click()
    page.locator('[data-action="allow-save"]').click()
    page.wait_for_selector('.result-preview',timeout=7000)
    shot('standalone-result.png')
    with page.expect_download() as download_info:
        page.locator('[data-action="download"]').click()
    download=download_info.value
    assert download.suggested_filename.endswith('.webp')
    assert Path(download.path()).read_bytes()==(QA.parent/'assets/cafe.webp').read_bytes()
    page.locator('[data-action="favorite"]').click()
    page.wait_for_selector('[data-action="deny-thumbnails"]')
    page.locator('[data-action="deny-thumbnails"]').click()
    saved=page.evaluate('JSON.parse(localStorage.getItem("musepilot.demo.v1"))')
    assert len(saved['sessions'])==1 and saved['sessions'][0]['favorite']
    assert saved['styleWeights']['cafe-natural']==3
    assert saved['sessions'][0]['photoRef']=='assets/cafe.webp'
    assert 'data:image' not in json.dumps(saved) and 'blob:' not in json.dumps(saved)
    assert page.locator('.session-thumb').count()==0
    shot('standalone-sessions.png')
    page.reload()
    page.wait_for_selector('.hero')
    page.locator('[data-action="tab"][data-tab="sessions"]').click()
    assert page.locator('.session-row').count()==1
    page.locator('[data-action="tab"][data-tab="style"]').click()
    assert page.locator('.style-item').count()==1
    shot('standalone-style.png')
    page.locator('[data-action="settings"]').click()
    page.select_option('#appearance','dark')
    assert page.locator('#device').get_attribute('data-theme')=='dark'
    shot('standalone-dark.png')
    assert page.locator('.settings-row small').first.evaluate('(el)=>getComputedStyle(el).color')=='rgb(165, 170, 158)'
    assert page.locator('.topbar-title').evaluate('(el)=>getComputedStyle(el).color')=='rgb(240, 240, 231)'
    assert not errors, errors
    nonlocal_requests=[r for r in requests if not r.startswith(('file:','data:','blob:'))]
    file_assets=[r for r in requests if r.startswith('file:') and not r.endswith('MusePilot_Demo.html')]
    assert not nonlocal_requests and not file_assets, (nonlocal_requests,file_assets)
    result={'passed':True,'offline':True,'embedded_images':4,'persisted_sessions':1,'favorite_weight':3,'photo_bytes_persisted':False,'download_matches_local_asset':True,'dark_text_contrast_verified':True,'page_errors':errors,'remote_requests':nonlocal_requests,'external_file_requests':file_assets,'viewports':[320,393,430,1440],'small_dialog_targets':targets}
    (QA/'standalone-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result),flush=True)
    browser.close()
