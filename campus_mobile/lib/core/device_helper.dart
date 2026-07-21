import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// Provides a stable device identifier for one-device-per-student binding.
/// Prefers platform hardware IDs (survive app reinstall) with a persisted
/// installation UUID as fallback when platform IDs are unavailable.
class DeviceHelper {
  static const _storageKey = 'campus_device_install_id';
  static String? _cachedDeviceId;

  static Future<String?> getDeviceId() async {
    if (_cachedDeviceId != null) return _cachedDeviceId;
    if (kIsWeb) return null;

    try {
      final info = DeviceInfoPlugin();
      String? platformId;

      if (Platform.isAndroid) {
        platformId = (await info.androidInfo).id;
      } else if (Platform.isIOS) {
        platformId = (await info.iosInfo).identifierForVendor;
      }

      if (platformId != null && platformId.isNotEmpty) {
        _cachedDeviceId = platformId;
        return _cachedDeviceId;
      }

      final prefs = await SharedPreferences.getInstance();
      var installId = prefs.getString(_storageKey);
      if (installId == null || installId.isEmpty) {
        installId = const Uuid().v4();
        await prefs.setString(_storageKey, installId);
      }

      _cachedDeviceId = installId;
      return _cachedDeviceId;
    } catch (_) {
      return null;
    }
  }
}
