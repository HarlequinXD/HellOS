#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
sdk="${HELLOS_SDK:-$PWD/tools/build-tools}"
out="${1:-$PWD/HellOS-6.6.9-S23-Fullscreen.apk}"
build=$(mktemp -d)
trap 'rm -rf "$build"' EXIT
mkdir -p "$build/classes" "$build/dex" "$build/gen"
android="$sdk/android-35/android.jar"
python - "$build/AndroidManifest.xml" <<'PY'
import sys,xml.etree.ElementTree as E
E.register_namespace('android','http://schemas.android.com/apk/res/android')
t=E.parse('app/src/main/AndroidManifest.xml');r=t.getroot();a='{http://schemas.android.com/apk/res/android}'
r.set('package','com.harlequinxd.hellos');r.set(a+'versionCode','4');r.set(a+'versionName','6.6.9')
E.SubElement(r,'uses-sdk',{a+'minSdkVersion':'26',a+'targetSdkVersion':'35'})
t.write(sys.argv[1],encoding='utf-8',xml_declaration=True)
PY
"$sdk/aapt2" compile --dir app/src/main/res -o "$build/res.zip"
"$sdk/aapt2" link -I "$android" --manifest "$build/AndroidManifest.xml" --java "$build/gen" -A app/src/main/assets -o "$build/unsigned.apk" "$build/res.zip"
java -jar "$sdk/ecj.jar" -8 -proc:none -cp "$android" -d "$build/classes" $(find app/src/main/java -name '*.java')
java -cp "$sdk/r8.jar" com.android.tools.r8.D8 --lib "$android" --min-api 26 --output "$build/dex" $(find "$build/classes" -name '*.class')
python - "$build" <<'PY'
import sys,zipfile
from pathlib import Path
p=Path(sys.argv[1])
with zipfile.ZipFile(p/'unsigned.apk','a',zipfile.ZIP_DEFLATED) as z:z.write(p/'dex/classes.dex','classes.dex')
PY
java -jar "$sdk/ecj.jar" -17 -proc:none -cp "$sdk/apksig.jar" -d "$build/classes" tools/SignApk.java
HELLOS_KEY_PASS=hellos666 java -cp "$sdk/apksig.jar:$build/classes" SignApk keystore/hellos-debug.jks "$build/unsigned.apk" "$out"
