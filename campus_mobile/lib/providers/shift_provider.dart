import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/api_service.dart';

class ShiftProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  Map<String, dynamic>? _activeShift;
  bool _isLoading = false;
  String? _startShiftError;

  Map<String, dynamic>? get activeShift => _activeShift;
  bool get isLoading => _isLoading;
  bool get hasActiveShift => _activeShift != null;
  String? get startShiftError => _startShiftError;

  Future<void> fetchActiveShift() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _api.get('/security/shifts/active');
      _activeShift = response.data;
    } catch (e) {
      _activeShift = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> startShift() async {
    _isLoading = true;
    _startShiftError = null;
    notifyListeners();
    try {
      final response = await _api.post('/security/shifts/start');
      _activeShift = response.data;
      notifyListeners();
      return true;
    } on DioException catch (e) {
      // Extract backend error message (e.g. "You cannot start your shift yet...")
      final data = e.response?.data;
      if (data is Map && data['message'] != null) {
        _startShiftError = data['message'] as String;
      } else {
        _startShiftError = 'Failed to start shift. Please try again.';
      }
      notifyListeners();
      return false;
    } catch (e) {
      _startShiftError = 'Failed to start shift. Please check your connection.';
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> endShift({String notes = ''}) async {
    _isLoading = true;
    notifyListeners();
    try {
      await _api.patch('/security/shifts/end', data: {'notes': notes});
      _activeShift = null;
      notifyListeners();
      return true;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clear() {
    _activeShift = null;
    _startShiftError = null;
    notifyListeners();
  }
}
