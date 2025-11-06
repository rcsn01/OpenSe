iOS native modules on Windows

If you ran `npx install-expo-modules` on Windows and saw errors like `pod install` failing with
`spawn C:\WINDOWS\system32\cmd.exe ENOENT`, that's expected: installing iOS native dependencies
requires CocoaPods and a macOS environment.

What happened
- The installer attempts to run `pod install` to wire native iOS dependencies. That step requires a macOS
  machine with CocoaPods and Xcode tools installed. It cannot run on a standard Windows machine.

Options to proceed
- If you only need to test on Expo Go (no custom native code), you can skip running the iOS pod steps and
  continue developing on Windows. Expo Go bundles many native modules already.
- To fully install native iOS modules (or build a development client), run `npx install-expo-modules` or
  `pod install` on a macOS machine (your Mac or a CI runner with macOS). After that you can build/run the
  iOS app or development client.
- Alternatively use EAS Build or an online macOS CI to create a dev build if you don't have a local Mac.

Quick recommendations
- To add the JS dependency only (no pods), run:

```powershell
npx expo install expo-camera
```

This will add the package to your project and let Expo Go use the camera (if the module is supported by your
Expo Go client). If you need a custom development client or a production iOS build, perform the iOS native
install on macOS or use EAS Build.
