"""Browser QA for the local MusePilot HTML demo. No package install required.

Run: python demo/qa/interaction_test.py --url http://127.0.0.1:4173
Uses the locally installed Python Playwright and Google Chrome. Writes evidence
to results.json beside this script. It never changes the application source.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parents[2]
QA = Path(__file__).resolve().parent
STORAGE_KEY = "musepilot.demo.v1"
REPORT = {
    "started_at": datetime.now(timezone.utc).isoformat(),
    "scope": "Real Chrome interaction tests; sample camera only; no real payment or Photos APIs",
    "tests": [], "console_errors": [], "page_errors": [],
    "http_errors": [], "remote_requests": [], "request_failures": [],
}


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def state(page):
    return page.evaluate("key => JSON.parse(localStorage.getItem(key)) || window.MuseModel.createData()", STORAGE_KEY)


def click(page, action, value=None, **kwargs):
    selector = f'[data-action="{action}"]'
    if value is not None:
        selector += f'[data-id="{value}"]'
    page.locator(selector).first.click(timeout=7000, **kwargs)


def tab(page, name):
    page.locator(f'[data-action="tab"][data-tab="{name}"]').click()


def loaded(page, url):
    page.goto(url, wait_until="load", timeout=15000)
    expect(page.locator('[data-action="start"]').first).to_be_visible(timeout=7000)


def sample(page):
    click(page, "start")
    if page.locator('[data-action="sample-camera"]').count():
        click(page, "sample-camera")
    expect(page.locator('.coach')).to_be_visible()


def ready(page):
    for _ in range(4):
        if page.locator('[data-action="shutter"]').is_enabled():
            return
        button = page.locator('[data-action="next-step"]')
        if not button.count():
            break
        button.click()
        expect(button).to_be_disabled()
        page.wait_for_timeout(520)
    expect(page.locator('[data-action="shutter"]')).to_be_enabled()


def capture(page):
    click(page, "shutter")
    if page.locator('[data-action="allow-save"]').count():
        click(page, "allow-save")
    expect(page.locator('[data-action="keep"]')).to_be_visible(timeout=7000)


def attach(page, label):
    page.on("console", lambda msg: REPORT["console_errors"].append({"test": label, "text": msg.text}) if msg.type == "error" else None)
    page.on("pageerror", lambda error: REPORT["page_errors"].append({"test": label, "text": str(error)}))
    page.on("response", lambda response: REPORT["http_errors"].append({"test": label, "status": response.status, "url": response.url}) if response.status >= 400 else None)
    page.on("requestfailed", lambda request: REPORT["request_failures"].append({"test": label, "url": request.url, "failure": request.failure}))
    page.on("request", lambda request: REPORT["remote_requests"].append({"test": label, "url": request.url}) if request.url.startswith(("http:", "https:")) and not request.url.startswith(("http://127.0.0.1:", "http://localhost:")) else None)


def run_case(browser, name, callback, viewport=None):
    started = time.monotonic()
    context = browser.new_context(viewport=viewport or {"width": 393, "height": 852}, reduced_motion="reduce")
    page = context.new_page()
    attach(page, name)
    result = {"name": name}
    try:
        result["evidence"] = callback(page, context) or {}
        result["status"] = "passed"
    except Exception as error:
        result.update(status="failed", error=str(error), traceback=traceback.format_exc())
        try:
            path = QA / (name.replace(" ", "_").replace("/", "_") + "-failure.png")
            page.screenshot(path=str(path), full_page=True)
            result["screenshot"] = str(path)
            result["visible_text"] = page.locator("body").inner_text()[-6000:]
        except Exception:
            pass
    finally:
        result["seconds"] = round(time.monotonic() - started, 2)
        REPORT["tests"].append(result)
        context.close()
        print(f'{result["status"].upper()}: {name}' + (f' — {result["error"][:200]}' if result.get("error") else ""), flush=True)


def layout(page, context):
    loaded(page, ARGS.url)
    page.wait_for_function('Array.from(document.images).every(image => image.complete && image.naturalWidth > 0)', timeout=10000)
    metrics = page.evaluate("""() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      deviceWidth: document.querySelector('#device').getBoundingClientRect().width,
      viewClient: document.querySelector('#view').clientWidth,
      viewScroll: document.querySelector('#view').scrollWidth,
      imagesLoaded: [...document.images].every(i=>i.complete && i.naturalWidth > 0)
    })""")
    check(metrics["documentWidth"] <= metrics["viewport"] + 1, f'Document overflows: {metrics}')
    check(metrics["viewScroll"] <= metrics["viewClient"] + 1, f'App view overflows: {metrics}')
    check(metrics["imagesLoaded"], "Bundled image did not load")
    return metrics


def keep_favorite_reset_delete(page, context):
    loaded(page, ARGS.url)
    tab(page, "sessions")
    expect(page.locator('.empty-state')).to_be_visible()
    tab(page, "style")
    expect(page.locator('.empty-state')).to_be_visible()
    tab(page, "home")
    sample(page)
    check(page.locator('[data-action="voice"]').get_attribute('aria-pressed') == 'false', 'Voice must start off')
    check(page.locator('[data-action="outline"]').get_attribute('aria-pressed') == 'false', 'Outline must start off')
    ready(page)
    click(page, "shutter")
    expect(page.locator('[data-action="allow-save"]')).to_be_visible()
    click(page, "allow-save")
    expect(page.locator('#countdown')).to_be_visible()
    click(page, "cancel-countdown")
    expect(page.locator('.instruction h1')).to_contain_text("Paused")
    check(len(state(page)["sessions"]) == 0, 'Cancelled countdown wrote a session')
    check(page.locator('[data-action="keep"]').count() == 0, 'Cancelled countdown produced a photo')
    click(page, "pause")
    page.wait_for_timeout(650)
    ready(page)
    capture(page)
    click(page, "keep")
    expect(page.locator('[data-action="deny-thumbnails"]')).to_be_visible(timeout=5000)
    click(page, "deny-thumbnails")
    expect(page.locator('.session-row')).to_have_count(1)
    check(page.locator('.session-thumb').count() == 0, 'Thumbnail shown after permission denied')
    first = state(page)
    check(first["styleWeights"].get("cafe-natural") == 1, 'Keep must add one style point')
    tab(page, "style")
    expect(page.locator('.style-item')).to_have_count(1)
    page.reload(wait_until="load")
    expect(page.locator('[data-action="start"]').first).to_be_visible()
    tab(page, "sessions")
    expect(page.locator('.session-row')).to_have_count(1)
    click(page, "session")
    click(page, "favorite-session")
    expect(page.locator('[data-action="favorite-session"]')).to_be_disabled()
    page.locator('[data-action="favorite-session"]').evaluate('(button) => { button.click(); button.click(); }')
    second = state(page)
    check(second["styleWeights"].get("cafe-natural") == 3, 'Favorite upgrade must total three, even after replay')
    check(len(second["sessions"]) == 1 and second["sessions"][0]["favorite"], 'Favorite must upgrade the same session')
    click(page, "back")
    tab(page, "style")
    recent_count = len(state(page)["recentUses"])
    click(page, "reset-style")
    click(page, "confirm-reset")
    expect(page.locator('.empty-state')).to_be_visible()
    reset = state(page)
    check(reset["styleWeights"] == {} and len(reset["sessions"]) == 1 and len(reset["recentUses"]) == recent_count, 'Reset must preserve sessions and recent uses')
    click(page, "settings")
    click(page, "delete-data")
    delete = page.locator('[data-action="confirm-delete"]')
    expect(delete).to_be_disabled()
    page.locator('#delete-confirm').fill('delete')
    expect(delete).to_be_disabled()
    expect(page.locator('#delete-error')).to_contain_text('exactly')
    page.locator('#delete-confirm').fill('DELETE')
    expect(delete).to_be_enabled()
    click(page, "confirm-delete")
    deleted = state(page)
    check(not deleted["sessions"] and not deleted["styleWeights"] and not deleted["recentUses"], 'Delete must clear sessions, preferences and recent-use references')
    return {"cancelled_capture_sessions": 0, "keep_weight": 1, "favorite_total_weight": 3, "metadata_without_thumbnails": True, "reload_persisted": True, "reset_retained_sessions": 1, "delete_requires_exact_DELETE": True}


def paywall(page, context):
    loaded(page, ARGS.url)
    click(page, "look", "editorial")
    expect(page.locator('.modal-sheet[role="dialog"]')).to_contain_text('$6.99')
    expect(page.locator('.modal-sheet[role="dialog"]')).to_contain_text('$29.99')
    expect(page.locator('.modal-sheet[role="dialog"]')).to_contain_text('7-day')
    expect(page.locator('.modal-sheet[role="dialog"]')).to_contain_text('No real purchase')
    click(page, "close-modal")
    check(state(page)["lastSelection"]["lookId"] == "natural", 'Cancelled paywall changed original choice')
    click(page, "look", "editorial")
    click(page, "trial")
    expect(page.locator('.modal-sheet[role="dialog"]')).to_contain_text('No card, Apple ID or real payment')
    click(page, "activate-pro")
    expect(page.locator('.modal-sheet[role="dialog"]')).to_have_count(0, timeout=5000)
    saved = state(page)
    check(saved["subscription"] == {"active": True, "plan": "annual"}, 'Trial did not activate annual demo access')
    check(saved["lastSelection"]["lookId"] == "editorial", 'Pending locked selection was lost')
    expect(page.locator('[data-action="look"][data-id="editorial"]')).to_have_attribute('aria-pressed', 'true')
    click(page, "scene", "professional")
    expect(page.locator('.hero-bottom')).to_contain_text('Professional')
    check(state(page)["lastSelection"]["contextId"] == "professional", 'Pro scene remains locked after demo trial')
    return {"monthly": 6.99, "annual": 29.99, "trial_days": 7, "cancel_preserves_choice": True, "pending_look_restored": True, "real_payment": False}


def coach_edges(page, context):
    loaded(page, ARGS.url)
    sample(page)
    click(page, "outline")
    expect(page.locator('.outline-overlay')).to_be_visible()
    click(page, "pause")
    expect(page.locator('.instruction h1')).to_contain_text('Paused')
    expect(page.locator('.outline-overlay')).to_have_count(0)
    expect(page.locator('[data-action="next-step"]')).to_have_count(0)
    expect(page.locator('[data-action="shutter"]')).to_be_disabled()
    click(page, "pause")
    page.wait_for_timeout(650)
    click(page, "coach-mode", "shooting")
    expect(page.locator('.instruction h1')).to_contain_text('their shoulders')
    click(page, "conditions")
    click(page, "condition", "lowlight")
    expect(page.locator('.instruction h1')).to_contain_text('light')
    expect(page.locator('[data-action="shutter"]')).to_be_disabled()
    expect(page.locator('.outline-overlay')).to_have_count(0)
    expect(page.locator('[data-action="next-step"]')).to_have_count(0)
    click(page, "recover")
    page.wait_for_timeout(650)
    ready(page)
    click(page, "shutter")
    click(page, "deny-save")
    expect(page.locator('[data-action="shutter"]')).to_be_disabled()
    expect(page.locator('[data-action="save-access"]')).to_be_visible()
    check(len(state(page)["sessions"]) == 0, 'Save denied still created a session')
    click(page, "save-access")
    click(page, "allow-save")
    expect(page.locator('[data-action="shutter"]')).to_be_enabled()
    capture(page)
    click(page, "retake")
    expect(page.locator('[data-action="coach-mode"][data-id="shooting"]')).to_have_attribute('aria-pressed', 'true')
    check(len(state(page)["sessions"]) == 0 and not state(page)["styleWeights"], 'Retake created a session or style preference')
    ready(page)
    capture(page)
    click(page, "discard")
    expect(page.locator('.modal-sheet[role="dialog"]')).to_contain_text('not deleted')
    click(page, "confirm-discard")
    expect(page.locator('[data-action="start"]').first).to_be_visible()
    check(len(state(page)["sessions"]) == 0 and not state(page)["styleWeights"], 'Discard created a session or style preference')
    return {"pause_freezes_guidance": True, "outline_hidden_when_paused_or_degraded": True, "role_changes_copy": True, "lowlight_blocks_capture": True, "save_denial_recoverable": True, "retake_preserves_role": True, "discard_no_style_or_session": True}


def permissions_offline(page, context):
    loaded(page, ARGS.url)
    click(page, "settings")
    click(page, "demo-options")
    click(page, "simulate-denial", "camera")
    click(page, "back")
    click(page, "start")
    expect(page.locator('.modal-sheet[role="dialog"]')).to_contain_text('Your plan is still here')
    click(page, "close-modal")
    click(page, "plan")
    expect(page.locator('.modal-sheet[role="dialog"]')).to_contain_text('Eye level')
    click(page, "close-modal")
    context.set_offline(True)
    try:
        page.wait_for_timeout(200)
        tab(page, "sessions")
        expect(page.locator('.empty-state')).to_be_visible()
        tab(page, "style")
        expect(page.locator('.empty-state')).to_be_visible()
        tab(page, "home")
        click(page, "start")
        click(page, "sample-camera")
        ready(page)
        check(not REPORT["remote_requests"], 'App requested a remote resource')
    finally:
        context.set_offline(False)
    return {"camera_denial_preserves_plan": True, "offline_navigation_and_coaching": True, "remote_resource_requests": 0}


def storage_edges(page, context):
    loaded(page, ARGS.url)
    page.evaluate('key => localStorage.setItem(key, "broken-json")', STORAGE_KEY)
    page.reload(wait_until="load")
    expect(page.locator('[data-action="repair-storage"]')).to_be_visible()
    check(page.evaluate('key => localStorage.getItem(key)', STORAGE_KEY) == 'broken-json', 'Corrupt record was overwritten without consent')
    click(page, "repair-storage")
    check(state(page)["version"] == 1, 'Corrupt record recovery failed')
    click(page, "settings")
    click(page, "demo-options")
    click(page, "storage-toggle")
    click(page, "back")
    click(page, "scene", "travel")
    expect(page.locator('#toast')).to_contain_text('storage is full')
    check(state(page)["lastSelection"]["contextId"] == 'cafe', 'Storage simulation unexpectedly persisted a change')
    expect(page.locator('[data-action="scene"][data-id="travel"]')).to_have_attribute('aria-pressed', 'true')
    return {"corrupt_record_preserved_until_confirmation": True, "quota_failure_feedback": True, "in_memory_use_continues": True}


def file_protocol(page, context):
    file_url = (ROOT / "demo" / "index.html").as_uri()
    loaded(page, file_url)
    sample(page)
    ready(page)
    capture(page)
    click(page, "favorite")
    expect(page.locator('[data-action="deny-thumbnails"]')).to_be_visible(timeout=5000)
    click(page, "deny-thumbnails")
    expect(page.locator('.session-row')).to_have_count(1)
    check(state(page)["styleWeights"]["cafe-natural"] == 3, 'file:// Favorite failed')
    page.reload(wait_until="load")
    expect(page.locator('[data-action="start"]').first).to_be_visible()
    tab(page, "sessions")
    expect(page.locator('.session-row')).to_have_count(1)
    return {"url": file_url, "core_flow_and_reload_persistence": True}


def pending_camera_cancellation(page, context):
    """Resolve a deliberately delayed camera request after each escape path.

    The stream is a stub whose tracks expose stop(), so no real camera or
    browser permission prompt is involved. A late stream must never reach UI.
    """
    evidence = []
    for escape in ['close-modal', 'sample-camera']:
        loaded(page, ARGS.url)
        page.evaluate("""() => {
          window.__cameraQA = {calls: 0, stopped: 0};
          Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
            configurable: true,
            value: () => {
              window.__cameraQA.calls++;
              return new Promise(resolve => {
                window.__cameraQA.resolve = () => resolve({
                  getTracks: () => [{stop: () => window.__cameraQA.stopped++}]
                });
              });
            }
          });
        }""")
        click(page, 'start')
        click(page, 'live-camera')
        expect(page.locator('[data-action="live-camera"]')).to_be_disabled()
        check(page.evaluate('window.__cameraQA.calls') == 1, 'Camera request was not started')
        click(page, escape)
        expect(page.locator('.modal-sheet[role="dialog"]')).to_have_count(0)
        if escape == 'sample-camera':
            expect(page.locator('.source-tag')).to_contain_text('GUIDED DEMO')
            expect(page.locator('[data-action="next-step"]')).to_be_enabled()
        else:
            expect(page.locator('[data-action="start"]').first).to_be_visible()
        page.evaluate('window.__cameraQA.resolve()')
        page.wait_for_function('window.__cameraQA.stopped === 1')
        check(page.locator('#live-video').count() == 0, 'Late camera request took over the preview')
        if escape == 'sample-camera':
            expect(page.locator('.source-tag')).to_contain_text('GUIDED DEMO')
        else:
            expect(page.locator('[data-action="start"]').first).to_be_visible()
            check(state(page)['permissions']['camera'] != 'granted', 'Cancelled request persisted granted access')
        evidence.append({"escape": escape, "late_track_stopped": True, "no_live_takeover": True})
    return {"escapes": evidence, "real_camera_requested": False}


def paused_role_change(page, context):
    loaded(page, ARGS.url)
    sample(page)
    page.evaluate("""() => {
      window.__speechQA = [];
      Object.defineProperty(speechSynthesis, 'speak', {
        configurable: true,
        value: utterance => window.__speechQA.push(utterance.text)
      });
    }""")
    click(page, 'voice')
    click(page, 'outline')
    click(page, 'pause')
    before = page.evaluate('window.__speechQA.length')
    click(page, 'coach-mode', 'shooting')
    page.wait_for_timeout(700)
    expect(page.locator('.instruction h1')).to_contain_text('Paused')
    expect(page.locator('[data-action="next-step"]')).to_have_count(0)
    expect(page.locator('.outline-overlay')).to_have_count(0)
    expect(page.locator('[data-action="shutter"]')).to_be_disabled()
    check(page.evaluate('window.__speechQA.length') == before, 'Switching role while paused spoke a new instruction')
    expect(page.locator('[data-action="coach-mode"][data-id="shooting"]')).to_have_attribute('aria-pressed', 'true')
    click(page, 'pause')
    expect(page.locator('[data-action="next-step"]')).to_be_enabled(timeout=3000)
    expect(page.locator('.instruction h1')).to_contain_text('their shoulders')
    return {"role_change_preserves_pause": True, "no_speech_or_next_step_until_resume": True, "resume_uses_new_role": True}


def paywall_selection_focus(page, context):
    loaded(page, ARGS.url)
    click(page, 'look', 'editorial')
    click(page, 'price', 'monthly')
    expect(page.locator('[data-action="price"][data-id="monthly"]')).to_be_focused()
    expect(page.locator('[data-action="price"][data-id="monthly"]')).to_have_attribute('aria-pressed', 'true')
    click(page, 'price', 'annual')
    expect(page.locator('[data-action="price"][data-id="annual"]')).to_be_focused()
    expect(page.locator('[data-action="price"][data-id="annual"]')).to_have_attribute('aria-pressed', 'true')
    # Focus stays within the modal when keyboard navigation crosses its edge.
    page.locator('[data-action="modal-privacy"]').focus()
    page.keyboard.press('Tab')
    expect(page.locator('[data-action="close-modal"]').first).to_be_focused()
    return {"monthly_focus_retained": True, "annual_focus_retained": True, "modal_keyboard_focus_trapped": True}


def main():
    global ARGS
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:4173')
    parser.add_argument('--chrome', default=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    ARGS = parser.parse_args()
    QA.mkdir(parents=True, exist_ok=True)
    REPORT["url"] = ARGS.url
    REPORT["source_hashes_before"] = {name: hashlib.sha256((ROOT/'demo'/name).read_bytes()).hexdigest() for name in ['index.html', 'styles.css', 'app.js', 'model.js']}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=ARGS.chrome, headless=True, timeout=20000)
            REPORT["browser_version"] = browser.version
            for width, height in [(320,740),(393,852),(430,932),(1440,1000)]:
                run_case(browser, f'layout_{width}', layout, {"width":width,"height":height})
            run_case(browser, 'keep_favorite_reset_delete', keep_favorite_reset_delete)
            run_case(browser, 'pro_paywall_pending_selection', paywall)
            run_case(browser, 'coach_pause_role_lowlight_save_retake_discard', coach_edges)
            run_case(browser, 'camera_permission_and_offline', permissions_offline)
            run_case(browser, 'corrupt_and_full_storage', storage_edges)
            run_case(browser, 'file_protocol_core_flow', file_protocol)
            run_case(browser, 'pending_camera_cancel_and_late_resolution', pending_camera_cancellation)
            run_case(browser, 'paused_role_change_requires_resume', paused_role_change)
            run_case(browser, 'paywall_preserves_selected_option_focus', paywall_selection_focus)
            browser.close()
    except Exception as error:
        REPORT["environment_error"] = str(error)
        REPORT["environment_traceback"] = traceback.format_exc()
    REPORT["source_hashes_after"] = {name: hashlib.sha256((ROOT/'demo'/name).read_bytes()).hexdigest() for name in ['index.html', 'styles.css', 'app.js', 'model.js']}
    REPORT["source_changed_during_run"] = REPORT["source_hashes_before"] != REPORT["source_hashes_after"]
    REPORT["finished_at"] = datetime.now(timezone.utc).isoformat()
    REPORT["summary"] = {"passed": sum(t['status']=='passed' for t in REPORT['tests']), "failed": sum(t['status']=='failed' for t in REPORT['tests']), "console_errors":len(REPORT['console_errors']), "page_errors":len(REPORT['page_errors']), "http_errors":len(REPORT['http_errors']), "remote_requests":len(REPORT['remote_requests'])}
    REPORT["passed"] = not REPORT.get('environment_error') and REPORT['summary']['failed']==0 and not REPORT['console_errors'] and not REPORT['page_errors'] and not REPORT['http_errors'] and not REPORT['remote_requests']
    (QA/'results.json').write_text(json.dumps(REPORT, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(REPORT['summary']), flush=True)
    return 0 if REPORT['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
