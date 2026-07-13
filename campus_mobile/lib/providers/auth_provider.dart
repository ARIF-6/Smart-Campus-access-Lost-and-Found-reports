import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import '../services/api_service.dart';
import '../core/constants.dart';
import 'package:dio/dio.dart';
import '../services/socket_service.dart';
import '../core/error_handler.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final SocketService _socketService = SocketService();
  String? _token;
  Map<String, dynamic>? _user;
  bool _isLoading = false;
  bool get isLoading => _isLoading;
  String? _errorMessage;

  bool get isAuthenticated => _token != null && !JwtDecoder.isExpired(_token!);
  String? get role => _user?['role'];
  Map<String, dynamic>? get user => _user;
    String? get classId {
    if (_user == null) return null;
    // Direct classId field
    if (_user!['classId'] != null) {
      return _user!['classId'].toString();
    }
    // Nested class object
    if (_user!['class'] is Map) {
      final classMap = _user!['class'] as Map<String, dynamic>;
      if (classMap['id'] != null) {
        return classMap['id'].toString();
      }
    }
    return null;
  }
  String? get errorMessage => _errorMessage;

  Future<void> checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(AppConstants.tokenKey);
    final userData = prefs.getString(AppConstants.userKey);
    if (userData != null) {
      _user = jsonDecode(userData);
      if (_token != null) {
        // Populate in-memory token cache so API requests don't need disk reads
        ApiService.setToken(_token!);
        _socketService.connect(_token!);
        _listenForShiftUpdates();
        // Fetch latest profile in background — don't await; UI shows cached data immediately
        fetchLatestProfile();
      }
    }
    notifyListeners();
  }

  Future<void> fetchLatestProfile() async {
    if (_token == null) return;
    try {
      final response = await _apiService.get('/auth/profile');
      if (response.statusCode == 200 && response.data != null) {
        await updateUserLocally(response.data);
      }
    } catch (_) {}
  }

  /// Registers a socket listener for real-time shift updates pushed by the
  /// backend whenever an admin edits a security guard's shift fields.
  void _listenForShiftUpdates() {
    _socketService.off('user:shiftUpdated'); // remove any stale listener first
    _socketService.on('user:shiftUpdated', (data) {
      if (data is Map) {
        final incoming = Map<String, dynamic>.from(data);
        // Only update shift-related fields to avoid overwriting other profile data
        final shiftFields = <String, dynamic>{};
        if (incoming.containsKey('assignedShift')) shiftFields['assignedShift'] = incoming['assignedShift'];
        if (incoming.containsKey('shiftStartTime')) shiftFields['shiftStartTime'] = incoming['shiftStartTime'];
        if (incoming.containsKey('shiftEndTime')) shiftFields['shiftEndTime'] = incoming['shiftEndTime'];
        if (shiftFields.isNotEmpty) {
          updateUserLocally(shiftFields);
        }
      }
    });
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiService.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        if (response.data['token'] == null || response.data['user'] == null) {
           throw Exception('Invalid server response: Missing token or user data');
        }
        _token = response.data['token'];
        _user = response.data['user'];
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.tokenKey, _token!);
        await prefs.setString(AppConstants.userKey, jsonEncode(_user));

        // Populate in-memory token cache immediately so subsequent requests
        // don't need a SharedPreferences disk read.
        ApiService.setToken(_token!);
        
        // Connect Socket and start listening for server-pushed updates
        _socketService.connect(_token!);
        _listenForShiftUpdates();

        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      // ... existing error handling ...
      if (e is DioException) {
        _errorMessage = ErrorHandler.getFriendlyMessage(e);
      } else {
        _errorMessage = 'An unexpected error occurred';
      }
    }
    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
    await prefs.remove(AppConstants.userKey);

    // Invalidate the in-memory token cache
    ApiService.clearToken();

    // Remove shift update listener before disconnecting socket
    _socketService.off('user:shiftUpdated');
    // Disconnect Socket
    _socketService.disconnect();

    _token = null;
    _user = null;
    notifyListeners();
  }

  Future<void> updateUserLocally(Map<String, dynamic> updatedUserData) async {
    // Merge or replace user data
    if (_user != null) {
      _user = {..._user!, ...updatedUserData};
    } else {
      _user = updatedUserData;
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.userKey, jsonEncode(_user));

    // Use addPostFrameCallback to safely notify listeners after the current
    // frame completes. This prevents the "Trying to render a disposed
    // EngineFlutterView" crash on Flutter Web when the provider notifies
    // during widget disposal.
    if (SchedulerBinding.instance.schedulerPhase != SchedulerPhase.idle) {
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    } else {
      notifyListeners();
    }
  }
}
