#!/bin/bash
# build-android-debug.sh
# Builds a debug APK from alphinium-app/react-native
# Tested: RN 0.76.5, Expo 52, AGP 8.9.1, Gradle 8.11.1, SDK 36
#
# Patches applied (all ephemeral, not committed):
#   1. react-native-screens pinned to 3.35.0 (4.x uses ViewManagerWithGeneratedInterface
#      which is incompatible with newArchEnabled=false in this build environment)
#   2. AGP 8.6.0 -> 8.9.1 in both RN version catalogs
#   3. Kotlin 1.9.24 -> 1.9.25 (Compose Compiler 1.5.15 requires 1.9.25)
#   4. Gradle wrapper -> 8.11.1 (required for AGP 8.9.1)
#   5. compileSdkVersion=36, suppressUnsupportedCompileSdk=36
#
# Run inside the alphinium-app/react-native directory

set -e

CATALOG1="node_modules/react-native/gradle/libs.versions.toml"
CATALOG2="node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml"

echo "[1/6] Pin react-native-screens@3.35.0"
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.dependencies['react-native-screens'] = '3.35.0';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo "[2/6] npm install"
npm install --legacy-peer-deps

echo "[3/6] expo prebuild"
npx expo prebuild --platform android --no-install

echo "[4/6] Patch AGP 8.6.0->8.9.1 and Kotlin 1.9.24->1.9.25"
sed -i 's/8\.6\.0/8.9.1/g' "$CATALOG1" "$CATALOG2"
sed -i 's/1\.9\.24/1.9.25/g' "$CATALOG1" "$CATALOG2"

echo "[5/6] Patch gradle.properties (compileSdk 36) and wrapper (8.11.1)"
cat >> android/gradle.properties << 'PROPS'
android.compileSdkVersion=36
android.targetSdkVersion=36
android.suppressUnsupportedCompileSdk=36
PROPS
sed -i 's|distributions/gradle-[0-9.]*-all|distributions/gradle-8.11.1-all|g' android/gradle/wrapper/gradle-wrapper.properties
sed -i 's|distributions/gradle-[0-9.]*-bin|distributions/gradle-8.11.1-bin|g' android/gradle/wrapper/gradle-wrapper.properties

echo "[6/6] Gradle assembleDebug"
cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon --max-workers=2

APK=$(find app/build/outputs/apk/debug -name "*.apk" | head -1)
echo "APK: $APK ($(du -h "$APK" | cut -f1))"
