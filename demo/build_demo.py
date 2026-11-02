"""Package the buildless source and a truly standalone offline HTML file.

Uses only Python's standard library. Assets stay as references in the domain
model; the standalone UI resolves them at render time. No image bytes enter
the localStorage session records.
"""
from pathlib import Path
import base64
import json
import shutil
import zipfile

DEMO = Path(__file__).resolve().parent
ROOT = DEMO.parent

def build():
    html = (DEMO / 'index.html').read_text(encoding='utf-8')
    style_names = ['styles.css', 'ui-refinement.css', 'ui-pages.css']
    model = (DEMO / 'model.js').read_text(encoding='utf-8')
    app = (DEMO / 'app.js').read_text(encoding='utf-8')
    image_names = ['cafe.webp', 'outfit.webp', 'travel.webp', 'window-light.webp']
    assets = {'assets/' + name: 'data:image/webp;base64,' + base64.b64encode((DEMO / 'assets' / name).read_bytes()).decode('ascii') for name in image_names}
    favicon = 'data:image/svg+xml;base64,' + base64.b64encode((DEMO/'assets/favicon.svg').read_bytes()).decode('ascii')
    html = html.replace('href="assets/favicon.svg"', 'href="' + favicon + '"')
    # Preserve the same cascade as the source entry: legacy components first,
    # shared visual foundations next, page-specific refinements last.
    for name in style_names:
        css = (DEMO / name).read_text(encoding='utf-8')
        html = html.replace('<link rel="stylesheet" href="' + name + '">', '<style data-source="' + name + '">\n' + css + '\n</style>')
    # Keep the historical lookup name while the source UI migrates its brand.
    html = html.replace('<script src="model.js"></script>', '<script>window.PoseProAssets=window.MuseAssets=' + json.dumps(assets, separators=(',', ':')) + ';\n' + model.replace('</script', '<\\/script') + '\n</script>')
    html = html.replace('<script src="app.js"></script>', '<script>\n' + app.replace('</script', '<\\/script') + '\n</script>')
    standalone = ROOT/'PosePro_Demo.html'
    standalone.write_text(html, encoding='utf-8')
    # Historical QA and tests target the earlier demo. Do not ship them as
    # evidence that this version was verified; the source folder retains them.
    deliverables = ['index.html'] + style_names + ['model.js', 'app.js', 'README.md', 'build_demo.py']
    archive = ROOT/'PosePro_Demo.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.write(standalone, 'PosePro_Demo.html')
        for name in ['PosePro_AI_Camera_PRD_V2.1.md', 'PosePro_Portrait_Photography_Rules_V1.0.md']:
            reference = ROOT/name
            if reference.exists(): z.write(reference, name)
        for name in deliverables + ['assets/'+n for n in image_names] + ['assets/favicon.svg']:
            p=DEMO/name
            if p.exists(): z.write(p, 'source/'+name)
    legacy_standalone = ROOT/'MusePilot_Demo.html'
    legacy_archive = ROOT/'MusePilot_Demo.zip'
    shutil.copyfile(standalone, legacy_standalone)
    shutil.copyfile(archive, legacy_archive)
    print(json.dumps({'standalone': str(standalone), 'standalone_bytes': standalone.stat().st_size, 'archive': str(archive), 'archive_bytes': archive.stat().st_size, 'images_embedded': len(assets), 'styles_embedded': len(style_names), 'legacy_copies': [str(legacy_standalone), str(legacy_archive)]}, ensure_ascii=False))

if __name__ == '__main__':
    build()
