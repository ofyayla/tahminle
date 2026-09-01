#!/bin/zsh

# Xcode Cloud runs this from the ci_scripts directory right after cloning.
# The committed ios/ project is an Expo (CNG) output, so we need Node + JS deps
# available before CocoaPods resolves the React Native packages.

set -e
set -x

cd "$CI_PRIMARY_REPOSITORY_PATH/mobile"

# Xcode Cloud images ship neither Node nor CocoaPods.
brew install node
brew install cocoapods

# Install JS dependencies (react-native, expo modules) so the Podfile can find them.
npm ci

# Refresh the native iOS project from app.json in case it drifted from the commit.
npx expo prebuild --platform ios --no-install

# Xcode Cloud also auto-detects CocoaPods, but run it explicitly to be safe.
cd ios
pod install
