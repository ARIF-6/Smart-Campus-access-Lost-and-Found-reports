import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants.dart';

/// Singleton-style API service with in-memory token caching.
/// The token is loaded from SharedPreferences once and then stored in memory,
/// eliminating repeated async disk reads on every HTTP request.
class ApiService {
  late Dio _dio;

  // ── In-memory token cache ─────────────────────────────────────────────────
  static String? _cachedToken;

  /// Call this immediately after login so subsequent requests use the token
  /// without waiting for SharedPreferences.
  static void setToken(String token) {
    _cachedToken = token;
  }

  /// Call this on logout to invalidate the in-memory cache.
  static void clearToken() {
    _cachedToken = null;
  }

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 10),
    ));

    // Trust Let's Encrypt / Custom SSL on older Android devices for our Render host
    try {
      (_dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
        final client = HttpClient();
        client.badCertificateCallback =
            (X509Certificate cert, String host, int port) {
          if (host == 'smart-campus-access-lost-and-found-dbgg.onrender.com') {
            return true;
          }
          return false;
        };
        return client;
      };
    } catch (_) {}

    _dio.interceptors.add(_RetryInterceptor(dio: _dio));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        options.headers['x-client-platform'] = 'mobile';

        // Use in-memory cached token first; fall back to SharedPreferences only
        // on the first request or after a restart (cache miss).
        String? token = _cachedToken;
        if (token == null) {
          final prefs = await SharedPreferences.getInstance();
          token = prefs.getString(AppConstants.tokenKey);
          if (token != null) {
            _cachedToken = token; // populate cache for subsequent requests
          }
        }
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        // Automatically unwrap the 'data' field from our standard backend response
        if (response.data is Map && response.data.containsKey('success')) {
          if (response.data['success'] == true) {
            response.data = response.data['data'];
          }
        }
        return handler.next(response);
      },
      onError: (DioException e, handler) {
        if (e.response?.statusCode == 401) {
          // Global unauthorized handling could go here
        }
        return handler.next(e);
      },
    ));
  }

  Future<Response> get(String path,
      {Map<String, dynamic>? queryParameters}) async {
    return await _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return await _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) async {
    return await _dio.put(path, data: data);
  }

  Future<Response> delete(String path) async {
    return await _dio.delete(path);
  }

  Future<Response> patch(String path, {dynamic data}) async {
    return await _dio.patch(path, data: data);
  }
}

class _RetryInterceptor extends Interceptor {
  final Dio dio;
  final int maxRetries;
  final Duration retryInterval;

  _RetryInterceptor({
    required this.dio,
    this.maxRetries = 2,           // reduced from 3
    this.retryInterval = const Duration(milliseconds: 1500), // reduced from 2s
  });

  @override
  Future<void> onError(
      DioException err, ErrorInterceptorHandler handler) async {
    final requestOptions = err.requestOptions;

    // Retry only on connection errors or timeouts, for non-GET requests or GET requests
    final bool isNetworkError =
        err.type == DioExceptionType.connectionTimeout ||
            err.type == DioExceptionType.sendTimeout ||
            err.type == DioExceptionType.receiveTimeout ||
            err.type == DioExceptionType.connectionError;

    int retryCount = requestOptions.extra['retryCount'] ?? 0;

    if (isNetworkError && retryCount < maxRetries) {
      retryCount++;
      requestOptions.extra['retryCount'] = retryCount;

      // Exponential backoff: 1.5s, 3s
      final delay = retryInterval * retryCount;
      await Future.delayed(delay);

      try {
        final response = await dio.request(
          requestOptions.path,
          data: requestOptions.data,
          queryParameters: requestOptions.queryParameters,
          options: Options(
            method: requestOptions.method,
            headers: requestOptions.headers,
            extra: requestOptions.extra,
            responseType: requestOptions.responseType,
            contentType: requestOptions.contentType,
          ),
        );
        return handler.resolve(response);
      } on DioException catch (retryErr) {
        return super.onError(retryErr, handler);
      }
    }

    return super.onError(err, handler);
  }
}
