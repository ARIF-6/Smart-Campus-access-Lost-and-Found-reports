import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../models/class_issue.dart';

class ClassIssueProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  final SocketService _socketService = SocketService();
  List<ClassIssue> _issues = [];
  bool _isLoading = false;

  List<ClassIssue> get issues => _issues;
  bool get isLoading => _isLoading;

  ClassIssueProvider() {
    _initSocketListeners();
  }

  void _initSocketListeners() {
    _socketService.on('classIssueCreated', (_) => fetchIssues());
    _socketService.on('classIssueSupportChanged', (_) => fetchIssues());
    _socketService.on('classIssueStatusUpdated', (_) => fetchIssues());
    _socketService.on('issueCreated', (_) => fetchIssues());
    _socketService.on('supportChanged', (_) => fetchIssues());
    _socketService.on('statusUpdated', (_) => fetchIssues());
  }

  void joinClassRoom(String classId) {
    if (classId.isNotEmpty) {
      _socketService.joinRoom('class:$classId');
    }
  }

  Future<void> fetchIssues() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _api.get('/class-issues');
      final dynamic responseData = response.data;

      List dynamicList = [];
      if (responseData is Map) {
        // sendSuccess returns { success, message, data }
        final payload = responseData['data'];
        if (payload is List) {
          dynamicList = payload;
        } else if (payload is Map && payload.containsKey('issues')) {
          dynamicList = payload['issues'] as List;
        }
      } else if (responseData is List) {
        dynamicList = responseData;
      }

      _issues = dynamicList.map((e) => ClassIssue.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      debugPrint('Error fetching class issues: $e');
      _issues = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Support an issue by sending a POST request to the backend
  Future<bool> supportIssue(String issueId) async {
    try {
      await _api.post('/class-issues/$issueId/support', data: {});
      // Refresh the list to reflect updated support count
      await fetchIssues();
      return true;
    } catch (e) {
      debugPrint('Error supporting class issue: $e');
      return false;
    }
  }

}
