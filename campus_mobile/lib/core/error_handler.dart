import 'package:dio/dio.dart';

/// Converts any raw exception into a clean, user-friendly message.
/// Never exposes database, socket, or internal stack-trace details.
class ErrorHandler {
  static String getFriendlyMessage(dynamic error) {
    if (error == null) return 'Something went wrong. Please try again.';

    if (error is DioException) {
      return _fromDio(error);
    }

    // Fallback: inspect the string form
    final s = error.toString().toLowerCase();
    return _fromString(s);
  }

  // ── DioException branch ────────────────────────────────────────────────────
  static String _fromDio(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
      case DioExceptionType.cancel:
      case DioExceptionType.badCertificate:
        return 'Check your connection. Try again.';
      case DioExceptionType.badResponse:
        return _fromResponse(e.response);
      case DioExceptionType.unknown:
        final inner = e.error?.toString().toLowerCase() ?? '';
        return _fromString(inner);
    }
  }

  // ── HTTP response branch ────────────────────────────────────────────────────
  static String _fromResponse(Response? response) {
    if (response == null) {
      return 'Check your connection. Try again.';
    }

    final status = response.statusCode ?? 0;
    final data   = response.data;

    // Check for our specific business rule message: "The supports does not reach the target"
    if (data is Map) {
      final rawMsg = (data['message'] ?? data['error'] ?? '').toString();
      if (rawMsg == 'The supports does not reach the target') {
        return 'The supports does not reach the target';
      }
    }

    // Strict mapping of status codes to completely hide technical/database messages
    if (status == 400) {
      return 'Invalid request. Please try again.';
    }
    if (status == 401) {
      return 'Incorrect username or password. Please try again.';
    }
    if (status == 403) {
      return 'Access denied. You do not have permission for this action.';
    }
    if (status == 404) {
      return 'The requested page or item could not be found. Please try again.';
    }
    if (status == 409) {
      return 'This request has already been processed or is active.';
    }
    if (status == 422) {
      return 'Validation failed. Please verify your details and try again.';
    }
    if (status >= 500) {
      return 'Check your connection. Try again.';
    }
    return 'Check your connection. Try again.';
  }

  // ── String-based fallback ───────────────────────────────────────────────────
  static String _fromString(String s) {
    if (s.contains('connection') ||
        s.contains('socketexception') ||
        s.contains('network') ||
        s.contains('unreachable') ||
        s.contains('timeout') ||
        s.contains('errno = 104') ||
        s.contains('broken pipe')) {
      return 'Check your connection. Try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}
