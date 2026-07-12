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
        return 'Connection timed out. Please check your internet and try again.';
      case DioExceptionType.sendTimeout:
        return 'Request timed out while sending. Your internet may be weak.';
      case DioExceptionType.receiveTimeout:
        return 'The server is taking too long to respond. Please try again.';
      case DioExceptionType.connectionError:
        // Inspect the inner error for more detail
        final inner = e.error?.toString().toLowerCase() ?? '';
        if (inner.contains('connection reset') || inner.contains('errno = 104')) {
          return 'Your internet connection seems weak or unstable. Please try again.';
        }
        if (inner.contains('failed host lookup') || inner.contains('nodename nor servname')) {
          return 'Cannot reach the server. Please check your internet connection.';
        }
        if (inner.contains('connection refused')) {
          return 'The server refused the connection. Please try again later.';
        }
        if (inner.contains('handshake') || inner.contains('certificate')) {
          return 'Secure connection failed. Please check your network settings.';
        }
        return 'Unable to connect to the server. Please check your internet connection.';
      case DioExceptionType.cancel:
        return 'Request was cancelled. Please try again.';
      case DioExceptionType.badCertificate:
        return 'Secure connection failed. Please check your network settings.';
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
      return 'No response from server. Please try again.';
    }

    final status = response.statusCode ?? 0;
    final data   = response.data;

    // Try to extract a human-readable message from the response body
    if (data is Map) {
      final raw = (data['message'] ?? data['error'] ?? '').toString();
      if (raw.isNotEmpty && !_isTechnical(raw)) {
        return raw;
      }
    }

    // Fall back to status-code descriptions
    if (status == 400) return 'Invalid request. Please check your input and try again.';
    if (status == 401) return 'You are not logged in. Please log in and try again.';
    if (status == 403) return 'You do not have permission to perform this action.';
    if (status == 404) return 'The requested item was not found.';
    if (status == 409) return 'A conflict occurred. The item may already exist.';
    if (status == 422) return 'Invalid data submitted. Please check your input.';
    if (status >= 500) return 'The server is temporarily unavailable. Please try again later.';
    return 'Something went wrong (code $status). Please try again.';
  }

  // ── String-based fallback ───────────────────────────────────────────────────
  static String _fromString(String s) {
    if (s.contains('connection reset') || s.contains('errno = 104') || s.contains('broken pipe')) {
      return 'Your internet connection seems weak or unstable. Please try again.';
    }
    if (s.contains('socketexception') || s.contains('network') ||
        s.contains('connection') || s.contains('unreachable')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (s.contains('timeout')) {
      return 'The request timed out. Please check your internet connection.';
    }
    if (_isTechnical(s)) {
      return 'Something went wrong. Please try again.';
    }
    return 'Something went wrong. Please try again.';
  }

  // ── Helper: detect technical/database noise ─────────────────────────────────
  static bool _isTechnical(String s) {
    const techTerms = [
      'mongo', 'database', 'query failed', 'cast to objectid',
      'duplicate key', 'validation failed', 'syntaxerror',
      'internal server error', 'stack trace', 'at object.',
      'null', 'undefined', 'exception', 'dioexception',
      'socketexception', 'errno', 'port =', 'onrender.com',
    ];
    final lower = s.toLowerCase();
    return techTerms.any((t) => lower.contains(t));
  }
}
