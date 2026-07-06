// lib/widgets/web_camera_capture.dart
//
// Compile-safe conditional export to support web camera capture in the browser
// without failing native (Android/iOS) compilations.

export 'camera_stub.dart'
    if (dart.library.js_util) 'camera_web.dart';
