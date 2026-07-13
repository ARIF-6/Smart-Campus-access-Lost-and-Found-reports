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
        // The server is reachable but not responding — likely a Render cold start
        return 'The server is taking too long to respond. Please wait a moment and try again.';
      case DioExceptionType.receiveTimeout:
        // Server accepted the request but is slow to send back data
        return 'Server is responding slowly. Please try again in a moment.';
      case DioExceptionType.connectionError:
        // Device cannot reach the server at all — likely no internet
        return 'Cannot reach the server. Please check your internet connection and try again.';
      case DioExceptionType.badCertificate:
        return 'A security error occurred. Please contact support.';
      case DioExceptionType.cancel:
        return 'Request was cancelled. Please try again.';
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
      return 'Cannot reach the server. Please check your internet connection and try again.';
    }

    final status = response.statusCode ?? 0;
    final data   = response.data;

    // Pass through known business-rule messages from the backend
    if (data is Map) {
      final rawMsg = (data['message'] ?? data['error'] ?? '').toString();
      // Specific messages we want to surface to the user verbatim
      if (rawMsg == 'The supports does not reach the target') {
        return 'The supports does not reach the target';
      }
      if (rawMsg.contains('Invalid Student ID')) {
        return rawMsg;
      }
    }

    // Strict mapping of status codes to safe user-facing messages
    if (status == 400) {
      // Surface the backend message directly — it contains useful validation info
      if (data is Map) {
        final rawMsg = (data['message'] ?? '').toString();
        if (rawMsg.isNotEmpty) return rawMsg;
      }
      return 'Invalid request. Please check your details and try again.';
    }
    if (status == 401) {
      return 'Incorrect username or password. Please try again.';
    }
    if (status == 403) {
      // Surface the backend message for 403 — it may be a business-rule message
      if (data is Map) {
        final rawMsg = (data['message'] ?? '').toString();
        if (rawMsg.isNotEmpty) return rawMsg;
      }
      return 'Access denied. You do not have permission for this action.';
    }
    if (status == 404) {
      return 'The requested item could not be found. Please try again.';
    }
    if (status == 409) {
      return 'This request has already been processed or is active.';
    }
    if (status == 422) {
      return 'Validation failed. Please verify your details and try again.';
    }
    if (status >= 500) {
      return 'The server encountered an error. Please try again in a moment.';
    }
    return 'Something went wrong. Please try again.';
  }

  // ── String-based fallback ───────────────────────────────────────────────────
  static String _fromString(String s) {
    if (s.contains('socketexception') ||
        s.contains('network') ||
        s.contains('unreachable') ||
        s.contains('errno = 104') ||
        s.contains('broken pipe')) {
      return 'Cannot reach the server. Please check your internet connection and try again.';
    }
    if (s.contains('timeout') || s.contains('connection')) {
      return 'The server is taking too long to respond. Please wait a moment and try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}
