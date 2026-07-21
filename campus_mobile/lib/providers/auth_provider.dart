import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import '../services/api_service.dart';
import '../core/constants.dart';
import '../core/device_helper.dart';
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
  bool _isConnectionError = false;

  bool get isAuthenticated {
    if (_token == null) return false;
    try {
      return !JwtDecoder.isExpired(_token!);
    } catch (_) {
      return false;
    }
  }
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
  bool get isConnectionError => _isConnectionError;

  Future<void> checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(AppConstants.tokenKey);
    final userData = prefs.getString(AppConstants.userKey);
    if (userData != null) {
      _user = jsonDecode(userData);
      if (_token != null) {
        ApiService.setToken(_token!);
        final deviceId = await DeviceHelper.getDeviceId();
        if (deviceId != null) {
          ApiService.setDeviceId(deviceId);
        }
        _socketService.connect(_token!);
        _listenForShiftUpdates();
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

  void _listenForShiftUpdates() {
    _socketService.off('user:shiftUpdated');
    _socketService.on('user:shiftUpdated', (data) {
      if (data is Map) {
        final incoming = Map<String, dynamic>.from(data);
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
      final deviceId = await DeviceHelper.getDeviceId();
      if (deviceId != null) {
        ApiService.setDeviceId(deviceId);
      }
      final response = await _apiService.post('/auth/login', data: {
        'email': email,
        'password': password,
        if (deviceId != null) 'deviceId': deviceId,
      });

      if (response.statusCode == 200) {
        final raw = response.data;
        if (raw is Map && (raw['token'] == null || raw['user'] == null)) {
          throw Exception('Invalid server response: Missing token or user data');
        }
        _token = (raw is Map ? raw['token'] : null) as String?;
        _user  = (raw is Map ? raw['user']  : null) as Map<String, dynamic>?;
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.tokenKey, _token!);
        await prefs.setString(AppConstants.userKey, jsonEncode(_user));

        ApiService.setToken(_token!);
        
        _socketService.connect(_token!);
        _listenForShiftUpdates();

        _isConnectionError = false;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      if (e is DioException) {
        _isConnectionError = e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.sendTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.connectionError;
        _errorMessage = ErrorHandler.getFriendlyMessage(e);
      } else {
        _isConnectionError = false;
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

    ApiService.clearToken();
    ApiService.clearDeviceId();

    _socketService.off('user:shiftUpdated');
    _socketService.disconnect();

    _token = null;
    _user = null;
    notifyListeners();
  }

  Future<void> updateUserLocally(Map<String, dynamic> updatedUserData) async {
    if (_user != null) {
      _user = {..._user!, ...updatedUserData};
    } else {
      _user = updatedUserData;
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.userKey, jsonEncode(_user));

    if (SchedulerBinding.instance.schedulerPhase != SchedulerPhase.idle) {
      SchedulerBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    } else {
      notifyListeners();
    }
  }
}
