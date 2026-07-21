import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:device_info_plus/device_info_plus.dart';

/// Production-ready permission helper for image/camera access.
///
/// Uses [DeviceInfoPlugin] to read [Build.VERSION.SDK_INT] from the native
/// Android API — the ONLY reliable SDK detection method across all OEMs
/// (Samsung, Xiaomi, Oppo, Vivo, Huawei, Tecno, Infinix, Realme, etc.).
///
/// Supports all Android versions 8 (API 26) through 15 (API 35).
class PermissionHelper {
  static final _deviceInfo = DeviceInfoPlugin();

  // ─── SDK Version ──────────────────────────────────────────────────────────

  /// Returns the true Android SDK_INT via [DeviceInfoPlugin].
  /// Falls back to 0 on any error (triggers safest path).
  static Future<int> getAndroidSdkInt() async {
    if (!Platform.isAndroid) return 0;
    try {
      final info = await _deviceInfo.androidInfo;
      return info.version.sdkInt;
    } catch (e) {
      debugPrint('[PermissionHelper] Could not read sdkInt: $e');
      return 0;
    }
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  /// Requests [Permission.camera].
  /// Returns [PermissionStatus.granted] on success.
  static Future<PermissionStatus> requestCameraPermission() async {
    if (kIsWeb) return PermissionStatus.granted;
    return await Permission.camera.request();
  }

  // ─── Photos / Gallery ─────────────────────────────────────────────────────

  /// Requests the correct gallery permission for the running Android version.
  ///
  /// | Android version | API  | Permission requested        |
  /// |-----------------|------|-----------------------------|
  /// | 14 + 15         | 34+  | READ_MEDIA_IMAGES           |
  /// | 13              | 33   | READ_MEDIA_IMAGES           |
  /// | 10 – 12         | 29–32| READ_EXTERNAL_STORAGE       |
  /// | 8 – 9           | 26–28| READ_EXTERNAL_STORAGE       |
  /// | Unknown / error | —    | Both (safest fallback)      |
  ///
  /// On iOS / web: requests [Permission.photos].
  static Future<PermissionStatus> requestPhotosPermission() async {
    if (kIsWeb) return PermissionStatus.granted;

    if (!Platform.isAndroid) {
      // iOS
      return await Permission.photos.request();
    }

    final sdk = await getAndroidSdkInt();
    debugPrint('[PermissionHelper] Android SDK_INT = $sdk');

    if (sdk >= 33) {
      // Android 13+ (API 33+): READ_MEDIA_IMAGES
      final status = await Permission.photos.request();
      debugPrint('[PermissionHelper] photos status = $status');
      return status;
    } else if (sdk >= 26) {
      // Android 8–12 (API 26–32): READ_EXTERNAL_STORAGE
      final status = await Permission.storage.request();
      debugPrint('[PermissionHelper] storage status = $status');
      return status;
    } else {
      // Unknown SDK — request both to guarantee OS dialog appears on any device
      debugPrint('[PermissionHelper] Unknown SDK — requesting both permissions');
      final results = await [
        Permission.photos,
        Permission.storage,
      ].request();

      final photosStatus = results[Permission.photos] ?? PermissionStatus.denied;
      final storageStatus = results[Permission.storage] ?? PermissionStatus.denied;

      if (photosStatus.isGranted || photosStatus.isLimited) return photosStatus;
      if (storageStatus.isGranted) return PermissionStatus.granted;
      if (photosStatus.isPermanentlyDenied || storageStatus.isPermanentlyDenied) {
        return PermissionStatus.permanentlyDenied;
      }
      return PermissionStatus.denied;
    }
  }

  // ─── Legacy getter (kept for backward-compat, do NOT use for new code) ───

  /// Deprecated: use [requestPhotosPermission()] instead.
  ///
  /// Returns the correct [Permission] object for the running Android version,
  /// but this is a SYNCHRONOUS call that cannot use [DeviceInfoPlugin].
  /// Retained only for callers not yet migrated to the async method.
  @Deprecated('Use requestPhotosPermission() instead')
  static Permission get photosPermission {
    if (Platform.isAndroid) {
      // Without DeviceInfoPlugin we cannot know SDK_INT reliably here.
      // Default to photos (READ_MEDIA_IMAGES) which works on Android 13+.
      // For older devices the async requestPhotosPermission() should be used.
      return Permission.photos;
    }
    return Permission.photos;
  }
}
