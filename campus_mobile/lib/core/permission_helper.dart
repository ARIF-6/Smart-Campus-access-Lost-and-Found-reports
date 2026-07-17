import 'dart:io';
import 'package:permission_handler/permission_handler.dart';

class PermissionHelper {
  /// Returns the Android major version integer from [Platform.operatingSystemVersion].
  ///
  /// On Android, [Platform.operatingSystemVersion] returns the *version string*,
  /// e.g. "13", "14", "Android 13", "Android 14.0", "13.0.0" — it NEVER contains
  /// "SDK XX". We extract the first numeric token which is the major version.
  ///
  /// Android 13 → SDK 33, Android 14 → SDK 34 (major + 20 for Android ≥ 10)
  static int getAndroidMajorVersion() {
    if (!Platform.isAndroid) return 0;
    try {
      final raw = Platform.operatingSystemVersion.trim();
      // Extract the first run of digits from the version string.
      final match = RegExp(r'(\d+)').firstMatch(raw);
      if (match != null) {
        return int.tryParse(match.group(1)!) ?? 0;
      }
    } catch (_) {}
    return 0;
  }

  /// Kept for backward compatibility — returns approximate SDK level.
  static int getAndroidSdkInt() {
    final major = getAndroidMajorVersion();
    // Android 13 → SDK 33, Android 14 → SDK 34, etc. (major + 20 for modern versions)
    if (major >= 10) return major + 20;
    // Rough fallback for older versions
    return 0;
  }

  /// Returns the correct photo-reading permission for the current Android version.
  ///
  /// - Android 13+ (API 33+): READ_MEDIA_IMAGES  → [Permission.photos]
  /// - Android ≤ 12  (API ≤ 32): READ_EXTERNAL_STORAGE → [Permission.storage]
  /// - iOS / other: [Permission.photos]
  static Permission get photosPermission {
    if (Platform.isAndroid) {
      final major = getAndroidMajorVersion();
      // Use Permission.photos (READ_MEDIA_IMAGES) on Android 13+
      if (major >= 13) {
        return Permission.photos;
      }
      // Use legacy storage permission on older Android
      return Permission.storage;
    }
    return Permission.photos;
  }
}
