"""Keep the checked-in Xcode project usable without XcodeGen on Windows.

Uses only the Python standard library. Mirrors project.yml's P0A targets;
source files remain in their Feature First folders. No developer signing team
or local provisioning profile is generated. Run from any working directory.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "MusePilot.xcodeproj"
objects: dict[str, dict] = {}


def uid(key: str) -> str:
    return hashlib.sha1(key.encode()).hexdigest()[:24].upper()


def add(key: str, isa: str, **fields) -> str:
    identifier = uid(key)
    objects[identifier] = dict(isa=isa, **fields)
    return identifier


def group(folder: Path, source_builds: list[str], resources: list[str]) -> str:
    children = []
    for child in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
        rel = child.relative_to(ROOT).as_posix()
        if child.is_dir():
            children.append(group(child, source_builds, resources))
        elif child.suffix in {".swift", ".xcprivacy"}:
            file_ref = add("file:" + rel, "PBXFileReference", path=child.name,
                           lastKnownFileType="sourcecode.swift" if child.suffix == ".swift" else "text.xml",
                           sourceTree="<group>")
            children.append(file_ref)
            build_ref = add("build:" + rel, "PBXBuildFile", fileRef=file_ref)
            (source_builds if child.suffix == ".swift" else resources).append(build_ref)
    return add("group:" + folder.relative_to(ROOT).as_posix(), "PBXGroup",
               children=children, path=folder.name, sourceTree="<group>")


def configurations(key: str, common: dict, project: bool = False) -> str:
    config_ids = []
    for name in ["Debug", "Release"]:
        settings = dict(common)
        if project and name == "Debug":
            settings.update(ENABLE_TESTABILITY="YES", SWIFT_OPTIMIZATION_LEVEL="-Onone",
                            SWIFT_ACTIVE_COMPILATION_CONDITIONS="$(inherited) DEBUG")
        elif project:
            settings.update(SWIFT_OPTIMIZATION_LEVEL="-O", SWIFT_COMPILATION_MODE="wholemodule")
        config_ids.append(add(key + ":" + name, "XCBuildConfiguration", name=name, buildSettings=settings))
    return add(key, "XCConfigurationList", buildConfigurations=config_ids,
               defaultConfigurationIsVisible=0, defaultConfigurationName="Release")


def value(item, indent: int = 0) -> str:
    if isinstance(item, dict):
        inner = "\n".join("\t" * (indent + 1) + f"{k} = {value(v, indent + 1)};" for k, v in item.items())
        return "{\n" + inner + "\n" + "\t" * indent + "}"
    if isinstance(item, list):
        return "(" + ", ".join(value(x, indent) for x in item) + ("," if item else "") + ")"
    if isinstance(item, int):
        return str(item)
    return json.dumps(item, ensure_ascii=False)


def main() -> None:
    source_builds: list[str] = []
    resources: list[str] = []
    test_builds: list[str] = []
    test_resources: list[str] = []
    app_group = group(ROOT / "MusePilot", source_builds, resources)
    test_group = group(ROOT / "MusePilotTests", test_builds, test_resources)
    app_product = add("product:app", "PBXFileReference", explicitFileType="wrapper.application",
                      path="MusePilot.app", sourceTree="BUILT_PRODUCTS_DIR")
    test_product = add("product:tests", "PBXFileReference", explicitFileType="wrapper.cfbundle",
                       path="MusePilotTests.xctest", sourceTree="BUILT_PRODUCTS_DIR")
    products = add("group:products", "PBXGroup", name="Products", sourceTree="<group>", children=[app_product, test_product])
    main_group = add("group:main", "PBXGroup", sourceTree="<group>", children=[app_group, test_group, products])
    phases = {}
    for target, sources, copies in [("app", source_builds, resources), ("tests", test_builds, test_resources)]:
        phases[target] = [
            add("sources:" + target, "PBXSourcesBuildPhase", buildActionMask=2147483647, files=sources, runOnlyForDeploymentPostprocessing=0),
            add("frameworks:" + target, "PBXFrameworksBuildPhase", buildActionMask=2147483647, files=[], runOnlyForDeploymentPostprocessing=0),
            add("resources:" + target, "PBXResourcesBuildPhase", buildActionMask=2147483647, files=copies, runOnlyForDeploymentPostprocessing=0),
        ]
    common = dict(SWIFT_VERSION="6.0", IPHONEOS_DEPLOYMENT_TARGET="17.0", SDKROOT="iphoneos",
                  CLANG_ENABLE_MODULES="YES", SWIFT_STRICT_CONCURRENCY="complete",
                  TARGETED_DEVICE_FAMILY="1", SUPPORTED_PLATFORMS="iphoneos iphonesimulator")
    project_configs = configurations("config:project", common, project=True)
    app_configs = configurations("config:app", dict(
        PRODUCT_BUNDLE_IDENTIFIER="com.musepilot.app", PRODUCT_NAME="MusePilot", PRODUCT_MODULE_NAME="MusePilot",
        GENERATE_INFOPLIST_FILE="YES", INFOPLIST_KEY_CFBundleDisplayName="PosePro",
        INFOPLIST_KEY_NSCameraUsageDescription="Use your camera for portraits and on-device framing guidance.",
        INFOPLIST_KEY_NSPhotoLibraryAddUsageDescription="Save the photos you choose to your Photos library.",
        INFOPLIST_KEY_UISupportedInterfaceOrientations="UIInterfaceOrientationPortrait",
        INFOPLIST_KEY_UIApplicationSceneManifest_Generation="YES", INFOPLIST_KEY_UILaunchScreen_Generation="YES",
    ))
    app_target = add("target:app", "PBXNativeTarget", name="MusePilot", productName="MusePilot", productReference=app_product,
                     productType="com.apple.product-type.application", buildConfigurationList=app_configs,
                     buildPhases=phases["app"], buildRules=[], dependencies=[])
    proxy = add("proxy:app", "PBXContainerItemProxy", containerPortal=uid("project"), proxyType=1,
                remoteGlobalIDString=app_target, remoteInfo="MusePilot")
    dependency = add("dependency:app", "PBXTargetDependency", target=app_target, targetProxy=proxy)
    test_configs = configurations("config:tests", dict(
        PRODUCT_BUNDLE_IDENTIFIER="com.musepilot.app.tests", PRODUCT_NAME="MusePilotTests",
        GENERATE_INFOPLIST_FILE="YES", TEST_HOST="$(BUILT_PRODUCTS_DIR)/MusePilot.app/MusePilot", BUNDLE_LOADER="$(TEST_HOST)",
    ))
    test_target = add("target:tests", "PBXNativeTarget", name="MusePilotTests", productName="MusePilotTests", productReference=test_product,
                      productType="com.apple.product-type.bundle.unit-test", buildConfigurationList=test_configs,
                      buildPhases=phases["tests"], buildRules=[], dependencies=[dependency])
    project = add("project", "PBXProject", attributes=dict(LastUpgradeCheck="1600"),
                  buildConfigurationList=project_configs, compatibilityVersion="Xcode 14.0", developmentRegion="en",
                  knownRegions=["en", "Base"], mainGroup=main_group, productRefGroup=products,
                  projectDirPath="", projectRoot="", targets=[app_target, test_target])
    document = dict(archiveVersion=1, classes={}, objectVersion=56, objects=objects, rootObject=project)
    PROJECT.mkdir(exist_ok=True)
    (PROJECT / "project.pbxproj").write_text("// !$*UTF8*$!\n" + value(document) + "\n", encoding="utf-8")

    scheme = ET.Element("Scheme", LastUpgradeVersion="1600", version="1.7")
    build = ET.SubElement(scheme, "BuildAction", parallelizeBuildables="YES", buildImplicitDependencies="YES")
    entries = ET.SubElement(build, "BuildActionEntries")
    def reference(parent, target_id, product, name):
        return ET.SubElement(parent, "BuildableReference", BuildableIdentifier="primary", BlueprintIdentifier=target_id,
                             BuildableName=product, BlueprintName=name, ReferencedContainer="container:MusePilot.xcodeproj")
    entry = ET.SubElement(entries, "BuildActionEntry", buildForTesting="YES", buildForRunning="YES", buildForProfiling="YES", buildForArchiving="YES", buildForAnalyzing="YES")
    reference(entry, app_target, "MusePilot.app", "MusePilot")
    test = ET.SubElement(scheme, "TestAction", buildConfiguration="Debug", selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB", selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB", shouldUseLaunchSchemeArgsEnv="YES")
    testable = ET.SubElement(ET.SubElement(test, "Testables"), "TestableReference", skipped="NO")
    reference(testable, test_target, "MusePilotTests.xctest", "MusePilotTests")
    launch = ET.SubElement(scheme, "LaunchAction", buildConfiguration="Debug", selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB", selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB", launchStyle="0", useCustomWorkingDirectory="NO", ignoresPersistentStateOnLaunch="NO", debugDocumentVersioning="YES", debugServiceExtension="internal", allowLocationSimulation="YES")
    reference(ET.SubElement(launch, "BuildableProductRunnable", runnableDebuggingMode="0"), app_target, "MusePilot.app", "MusePilot")
    ET.SubElement(scheme, "AnalyzeAction", buildConfiguration="Debug")
    ET.SubElement(scheme, "ArchiveAction", buildConfiguration="Release", revealArchiveInOrganizer="YES")
    scheme_path = PROJECT / "xcshareddata" / "xcschemes" / "MusePilot.xcscheme"
    scheme_path.parent.mkdir(parents=True, exist_ok=True)
    ET.indent(scheme)
    ET.ElementTree(scheme).write(scheme_path, encoding="utf-8", xml_declaration=True)
    print(f"Synced {len(source_builds)} Swift app files, {len(test_builds)} test files, {len(resources)} resources; scheme MusePilot.")


if __name__ == "__main__":
    main()
