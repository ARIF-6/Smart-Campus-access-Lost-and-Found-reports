import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

class AppConstants {
  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCTION BACKEND URL
  // Replace this with the actual public URL where your backend is deployed.
  // Examples:
  //   'https://campus-api.onrender.com'
  //   'https://api.yourcampus.com'
  //   'http://YOUR_VPS_PUBLIC_IP:5000'  (only if no HTTPS available)
  //
  // ⚠️  DO NOT use 192.168.x.x, 127.0.0.1, or 10.0.2.2 here — these are
  //     private/local addresses that only work on your development machine.
  // ─────────────────────────────────────────────────────────────────────────
  static const String _kProdBackendUrl = 'https://smart-campus-access-lost-and-found-dbgg.onrender.com';
  //                                      ↑ REPLACE THIS with your public backend URL

  // API URL
  static String get baseUrl {
    if (kReleaseMode) {
      return '$_kProdBackendUrl/api';
    }
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }
    try {
      if (Platform.isAndroid) {
        // 10.0.2.2 maps to the host machine's localhost from an Android emulator.
        return 'http://10.0.2.2:5000/api';
      }
    } catch (_) {}
    return 'http://localhost:5000/api';
  }

  static String get serverUrl {
    if (kReleaseMode) {
      return _kProdBackendUrl;
    }
    if (kIsWeb) {
      return 'http://localhost:5000';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:5000';
      }
    } catch (_) {}
    return 'http://localhost:5000';
  }

  // Helper for Image URLs (Handles local + Cloudinary)
  static String getImageUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    String cleanPath = path.replaceAll(RegExp(r'\\+'), '/');
    final RegExp exactMatchRegex = RegExp(r'(?:^|/)(uploads/[^?]*|profiles/[^?]*)');
    final match = exactMatchRegex.firstMatch(cleanPath);
    if (match != null) return '$serverUrl/${match.group(1)}';
    cleanPath = cleanPath.replaceFirst(RegExp(r'^[A-Za-z]:/'), '');
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    if (!cleanPath.startsWith('uploads/')) cleanPath = 'uploads/$cleanPath';
    return '$serverUrl/$cleanPath';
  }

  // ── Banking-App Design Tokens ─────────────────────────────────────
  // Primary navy (header, FAB, active states)
  static const Color primaryNavy    = Color(0xFF1B3A6B);
  // Mid blue (gradients, accents)
  static const Color midBlue        = Color(0xFF2563EB);
  // Light background
  static const Color backgroundColor = Color(0xFFF4F7FB);
  // Card surface
  static const Color cardColor      = Colors.white;
  // Subtle border / divider
  static const Color borderColor    = Color(0xFFE8EEF6);
  // Text colours
  static const Color textPrimary    = Color(0xFF0D1B38);
  static const Color textSecondary  = Color(0xFF6B7FA3);
  // Status
  static const Color successColor   = Color(0xFF22C55E);
  static const Color errorColor     = Color(0xFFEF4444);
  static const Color warningColor   = Color(0xFFF59E0B);

  // Legacy aliases (kept so existing code still compiles)
  static const Color primaryColor   = midBlue;
  static const Color secondaryColor = successColor;
  static const Color accentColor    = warningColor;
  static const Color statusValid    = successColor;
  static const Color statusInvalid  = errorColor;

  // Storage Keys
  static const String tokenKey = 'jwt_token';
  static const String userKey  = 'user_data';

  // Roles
  static const String roleAdmin    = 'admin';
  static const String roleStaff    = 'staff';
  static const String roleSecurity = 'security';
  static const String roleCleaner  = 'clean';
  static const String roleStudent  = 'student';
}
