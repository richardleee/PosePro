"""Static source/project checks. This does NOT compile Swift or run XCTest.

Standard library for project checks; --syntax additionally needs an already
available tree_sitter_language_pack. Never installs dependencies automatically.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import plistlib
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def read_openstep(text: str) -> dict:
    tokens = [m.group() for m in re.finditer(r'"(?:\\.|[^"\\])*"|//[^\n]*|/\*[\s\S]*?\*/|[{}()=;,]|[^\s{}()=;,]+', text)
              if not m.group().startswith(("//", "/*"))]
    index = 0

    def take(expected: str | None = None) -> str:
        nonlocal index
        token = tokens[index]
        index += 1
        if expected is not None and token != expected:
            raise ValueError(f"Expected {expected}, found {token}")
        return token

    def item():
        token = take()
        if token == "{":
            result = {}
            while tokens[index] != "}":
                key = take()
                key = json.loads(key) if key.startswith('"') else key
                take("=")
                if key in result:
                    raise ValueError(f"Duplicate project key {key}")
                result[key] = item()
                take(";")
            take("}")
            return result
        if token == "(":
            result = []
            while tokens[index] != ")":
                result.append(item())
                if tokens[index] != ")":
                    take(",")
            take(")")
            return result
        return json.loads(token) if token.startswith('"') else token

    document = item()
    if index != len(tokens):
        raise ValueError("Unexpected trailing project content")
    return document


def check(syntax: bool) -> None:
    project_path = ROOT / "MusePilot.xcodeproj" / "project.pbxproj"
    project = read_openstep(project_path.read_text(encoding="utf-8"))
    objects = project["objects"]
    root = objects[project["rootObject"]]
    all_paths: dict[str, Path] = {}

    def visit(identifier: str, parent: Path):
        obj = objects[identifier]
        path = parent / obj.get("path", "")
        if obj["isa"] == "PBXGroup":
            for child in obj["children"]:
                visit(child, path)
        elif obj["isa"] == "PBXFileReference" and obj.get("sourceTree") != "BUILT_PRODUCTS_DIR":
            assert path.is_file(), f"Project references missing file: {path}"
            all_paths[identifier] = path.resolve()
    visit(root["mainGroup"], ROOT)

    targets = {objects[t]["name"]: objects[t] for t in root["targets"]}
    assert set(targets) == {"MusePilot", "MusePilotTests"}
    for target_name, folder in [("MusePilot", "MusePilot"), ("MusePilotTests", "MusePilotTests")]:
        target = targets[target_name]
        sources = set()
        for phase_ref in target["buildPhases"]:
            phase = objects[phase_ref]
            if phase["isa"] == "PBXSourcesBuildPhase":
                sources.update(all_paths[objects[b]["fileRef"]] for b in phase["files"])
        expected = {p.resolve() for p in (ROOT / folder).rglob("*.swift")}
        assert sources == expected, f"Target membership differs: {target_name}: {sources ^ expected}"
    assert targets["MusePilotTests"]["dependencies"], "Tests must build the app module first"

    configs = objects[targets["MusePilot"]["buildConfigurationList"]]["buildConfigurations"]
    for config in configs:
        settings = objects[config]["buildSettings"]
        assert settings["INFOPLIST_KEY_NSCameraUsageDescription"]
        assert settings["INFOPLIST_KEY_NSPhotoLibraryAddUsageDescription"]
        assert settings["INFOPLIST_KEY_UISupportedInterfaceOrientations"] == "UIInterfaceOrientationPortrait"
        assert "INFOPLIST_KEY_NSMicrophoneUsageDescription" not in settings

    manifest_path = ROOT / "MusePilot/Resources/PrivacyInfo.xcprivacy"
    manifest = plistlib.loads(manifest_path.read_bytes())
    assert manifest["NSPrivacyTracking"] is False
    assert manifest["NSPrivacyCollectedDataTypes"] == []
    boot_time = next(v for v in manifest["NSPrivacyAccessedAPITypes"] if v["NSPrivacyAccessedAPIType"] == "NSPrivacyAccessedAPICategorySystemBootTime")
    assert "35F9.1" in boot_time["NSPrivacyAccessedAPITypeReasons"]
    resource_paths = {
        all_paths[objects[b]["fileRef"]]
        for phase_ref in targets["MusePilot"]["buildPhases"]
        for phase in [objects[phase_ref]] if phase["isa"] == "PBXResourcesBuildPhase"
        for b in phase["files"]
    }
    assert manifest_path.resolve() in resource_paths, "Privacy manifest missing from app resources"

    scheme = ET.parse(ROOT / "MusePilot.xcodeproj/xcshareddata/xcschemes/MusePilot.xcscheme")
    for ref in scheme.findall(".//BuildableReference"):
        assert objects[ref.attrib["BlueprintIdentifier"]]["isa"] == "PBXNativeTarget"
    assert scheme.find(".//TestableReference") is not None

    paths = list((ROOT / "MusePilot").rglob("*.swift")) + list((ROOT / "MusePilotTests").rglob("*.swift"))
    entry_count = sum(len(re.findall(r"(?m)^@main\b", p.read_text(encoding="utf-8"))) for p in paths)
    assert entry_count == 1, f"Expected one app entry, found {entry_count}"
    test_count = sum(len(re.findall(r"\bfunc test\w+\(", p.read_text(encoding="utf-8"))) for p in (ROOT / "MusePilotTests").glob("*.swift"))
    print(f"Project references and membership OK: {len(paths)} Swift files, {test_count} XCTest cases present (not executed).")
    print("Portrait settings, permission descriptions, privacy resource and shared test scheme OK.")
    if syntax:
        from tree_sitter_language_pack import get_parser
        parser = get_parser("swift")
        errors = []
        for path in paths:
            if parser.parse(path.read_bytes()).root_node.has_error:
                errors.append(str(path.relative_to(ROOT)))
        assert not errors, f"Swift parse errors: {errors}"
        print(f"Tree-sitter syntax parse OK: {len(paths)} files. Swift typechecking and XCTest still require Xcode.")


if __name__ == "__main__":
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--syntax", action="store_true")
    check(args.parse_args().syntax)
