"""Exercise browser camera capture using Chromium's synthetic media device.

No real hardware: launch flags supply a fake video stream and fake permission UI.
Run from the workspace: python demo/qa/live_camera_test.py
The separate results file records this synthetic-media scope explicitly.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, expect


QA = Path(__file__).resolve().parent
STORAGE_KEY = 'musepilot.demo.v1'


def check(condition, description):
    if not condition:
        raise AssertionError(description)


def click(page, action):
    page.locator(f'[data-action="{action}"]').first.click(timeout=10000)


def state(page):
    return page.evaluate('key => JSON.parse(localStorage.getItem(key))', STORAGE_KEY)


def complete_steps(page):
    for _ in range(4):
        click(page, 'next-step')
        page.wait_for_timeout(520)
    expect(page.locator('[data-action="shutter"]')).to_be_enabled()


def take_photo(page):
    click(page, 'shutter')
    if page.locator('[data-action="allow-save"]').count():
        click(page, 'allow-save')
    expect(page.locator('[data-action="keep"]')).to_be_visible(timeout=7000)
    preview = page.locator('.result-preview img').get_attribute('src')
    check(preview and preview.startswith('blob:'), f'Live capture did not produce a blob preview: {preview}')
    page.wait_for_function("document.querySelector('.result-preview img').complete && document.querySelector('.result-preview img').naturalWidth > 0")
    return preview


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:4173')
    parser.add_argument('--chrome', default=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    args = parser.parse_args()
    QA.mkdir(parents=True, exist_ok=True)
    report = {
        'started_at': datetime.now(timezone.utc).isoformat(),
        'url': args.url,
        'scope': 'Chromium synthetic video stream only; fake-device and fake-permission flags; no real camera hardware or iOS Photos API',
        'checks': [], 'console_errors': [], 'page_errors': [],
        'http_errors': [], 'remote_requests': [],
    }
    started = time.monotonic()
    browser = context = page = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                executable_path=args.chrome,
                headless=True,
                timeout=20000,
                args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
            )
            report['browser_version'] = browser.version
            context = browser.new_context(
                viewport={'width': 393, 'height': 852},
                reduced_motion='reduce', permissions=['camera'], accept_downloads=True,
            )
            page = context.new_page()
            page.on('console', lambda message: report['console_errors'].append(message.text) if message.type == 'error' else None)
            page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
            page.on('response', lambda response: report['http_errors'].append({'status': response.status, 'url': response.url}) if response.status >= 400 else None)
            page.on('request', lambda request: report['remote_requests'].append(request.url) if request.url.startswith(('http:', 'https:')) and not request.url.startswith(('http://127.0.0.1:', 'http://localhost:')) else None)
            page.goto(args.url, wait_until='load', timeout=15000)
            expect(page.locator('[data-action="start"]').first).to_be_visible()
            # A spy records revocation while still calling the real browser API.
            page.evaluate("""() => {
              window.__revokedCameraPreviews = [];
              const original = URL.revokeObjectURL.bind(URL);
              URL.revokeObjectURL = value => {
                window.__revokedCameraPreviews.push(value);
                original(value);
              };
            }""")
            click(page, 'start')
            click(page, 'live-camera')
            expect(page.locator('#live-video')).to_be_visible(timeout=10000)
            page.wait_for_function("document.querySelector('#live-video') && document.querySelector('#live-video').videoWidth > 0", timeout=15000)
            dimensions = page.locator('#live-video').evaluate('(video) => ({width: video.videoWidth, height: video.videoHeight})')
            report['checks'].append({'name': 'synthetic_live_preview', 'passed': True, 'dimensions': dimensions})

            complete_steps(page)
            first_preview = take_photo(page)
            with page.expect_download(timeout=10000) as download_event:
                click(page, 'download')
            download = download_event.value
            check(download.failure() is None, 'Browser reported a download failure')
            check(download.suggested_filename.lower().endswith('.jpg'), 'Live capture download must have .jpg extension')
            download_path = download.path()
            check(download_path is not None, 'Download path was unavailable')
            jpeg = Path(download_path).read_bytes()
            check(len(jpeg) > 100 and jpeg.startswith(b'\xff\xd8'), 'Downloaded capture is not a nonempty JPEG')
            report['checks'].append({'name': 'live_result_and_download', 'passed': True, 'preview_scheme': 'blob:', 'suggested_filename': download.suggested_filename, 'download_bytes': len(jpeg), 'jpeg_header_valid': True})

            click(page, 'retake')
            expect(page.locator('#live-video')).to_be_visible()
            check(first_preview in page.evaluate('window.__revokedCameraPreviews'), 'Retake did not revoke its discarded blob preview')
            check(len(state(page)['sessions']) == 0, 'An unkept retake created a persisted session')
            check(state(page)['styleWeights'] == {}, 'An unkept retake changed style')
            report['checks'].append({'name': 'retake_releases_preview_and_does_not_commit', 'passed': True})

            page.wait_for_function("document.querySelector('#live-video').videoWidth > 0")
            complete_steps(page)
            second_preview = take_photo(page)
            check(second_preview != first_preview, 'Retake reused the revoked blob URL')
            click(page, 'keep')
            expect(page.locator('[data-action="deny-thumbnails"]')).to_be_visible(timeout=5000)
            click(page, 'deny-thumbnails')
            expect(page.locator('.session-row')).to_have_count(1)
            kept = state(page)
            check(kept['sessions'][0]['photoRef'] == 'live-session', 'Live session must persist only its reference marker')
            raw = page.evaluate('key => localStorage.getItem(key)', STORAGE_KEY)
            check('blob:' not in raw and 'data:image' not in raw, 'Live image bytes or blob URLs leaked into persisted metadata')
            check(kept['styleWeights'].get('cafe-natural') == 1, 'Live Keep must add exactly one style contribution')
            report['checks'].append({'name': 'live_keep_persists_metadata_only', 'passed': True, 'photo_reference': 'live-session', 'sessions': 1, 'thumbnail_permission': kept['permissions']['thumbnails']})

            # Allow previews in memory, then reload. The persisted reference must
            # gracefully lose its ephemeral image without creating a broken img.
            click(page, 'thumbnail-notice')
            click(page, 'allow-thumbnails')
            expect(page.locator('.session-thumb')).to_have_count(1)
            page.reload(wait_until='load')
            expect(page.locator('[data-action="start"]').first).to_be_visible()
            page.locator('[data-action="tab"][data-tab="sessions"]').click()
            expect(page.locator('.session-row')).to_have_count(1)
            expect(page.locator('.session-thumb')).to_have_count(0)
            check(state(page)['permissions']['thumbnails'] == 'granted', 'Reload test must keep thumbnail permission to exercise missing-memory fallback')
            broken = page.locator('img').evaluate_all('(images) => images.filter(image => !image.complete || image.naturalWidth === 0).length')
            check(broken == 0, 'Reload left a broken live-thumbnail image')
            report['checks'].append({'name': 'reload_keeps_metadata_without_broken_live_image', 'passed': True, 'thumbnail_permission_still_granted': True, 'broken_images': broken})
            context.close()
            browser.close()
    except Exception as error:
        report['error'] = str(error)
        report['traceback'] = traceback.format_exc()
        if page:
            try:
                screenshot = QA/'live-camera-failure.png'
                page.screenshot(path=str(screenshot), full_page=True)
                report['failure_screenshot'] = str(screenshot)
                report['visible_text'] = page.locator('body').inner_text()[-5000:]
            except Exception:
                pass
    report['passed'] = len(report['checks']) == 5 and not any(report.get(key) for key in ['error', 'console_errors', 'page_errors', 'http_errors', 'remote_requests'])
    report['seconds'] = round(time.monotonic() - started, 2)
    report['finished_at'] = datetime.now(timezone.utc).isoformat()
    (QA/'live-camera-results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed': report['passed'], 'checks': len(report['checks']), 'error': report.get('error')}, ensure_ascii=False), flush=True)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
