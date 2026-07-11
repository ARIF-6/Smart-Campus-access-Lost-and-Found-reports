import 'package:dio/dio';

class ErrorHandler {
  static String getFriendlyMessage(dynamic error) {
    if (error == null) return "Something went wrong. Please try again later.";

    if (error is DioException) {
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.sendTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.connectionError) {
        return "Unable to connect to the server. Please try again.";
      }

      final response = error.response;
      if (response != null && response.data != null) {
        final data = response.data;
        if (data is Map) {
          final message = data['message'] ?? data['error'];
          if (message != null) {
            final String msgStr = message.toString().toLowerCase();
            // Hide database or raw technical stuff
            if (msgStr.contains('mongo') ||
                msgStr.contains('database') ||
                msgStr.contains('query') ||
                msgStr.contains('exception') ||
                msgStr.contains('cast to objectid') ||
                msgStr.contains('duplicate key') ||
                msgStr.contains('validation failed') ||
                msgStr.contains('syntaxerror') ||
                msgStr.contains('internal server error') ||
                msgStr.contains('null') ||
                msgStr.contains('undefined')) {
              return "Something went wrong. Please try again later.";
            }
            return message.toString();
          }
        }
      }

      if (error.error != null) {
        final String errStr = error.error.toString().toLowerCase();
        if (errStr.contains('socketexception') || errStr.contains('handshake') || errStr.contains('network')) {
          return "Unable to connect to the server. Please try again.";
        }
      }
      return "Unable to connect to the server. Please try again.";
    }

    final String errorStr = error.toString().toLowerCase();
    if (errorStr.contains('socketexception') || errorStr.contains('network') || errorStr.contains('connection')) {
      return "Unable to connect to the server. Please try again.";
    }
    if (errorStr.contains('mongo') ||
        errorStr.contains('database') ||
        errorStr.contains('sql') ||
        errorStr.contains('exception') ||
        errorStr.contains('nullpointer') ||
        errorStr.contains('format') ||
        errorStr.contains('syntax')) {
      return "Something went wrong. Please try again later.";
    }

    return "Something went wrong. Please try again later.";
  }
}
