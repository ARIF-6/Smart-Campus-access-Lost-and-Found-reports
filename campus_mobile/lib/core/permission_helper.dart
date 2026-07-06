import 'dart:io';
import 'package:permission_handler/permission_handler.dart';

class PermissionHelper {
  static int getAndroidSdkInt() {
    if (!Platform.isAndroid) return 0;
    try {
      final sdkRegex = RegExp(r'SDK\s+(\d+)');
      final match = sdkRegex.firstMatch(Platform.operatingSystemVersion);
      if (match != null) {
        return int.parse(match.group(1)!);
      }
    } catch (_) {}
    return 0;
  }

  static Permission get photosPermission {
    if (Platform.isAndroid) {
      final sdk = getAndroidSdkInt();
      if (sdk >= 33) {
        return Permission.photos;
      } else {
        return Permission.storage;
      }
    }
    return Permission.photos;
  }
}
