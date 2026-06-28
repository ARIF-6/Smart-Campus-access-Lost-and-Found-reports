import 'package:flutter/material.dart';
import '../../models/campus_issue.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';

class CampusIssueProvider with ChangeNotifier {
  final ApiService _api = ApiService();
  final SocketService _socketService = SocketService();
  List<CampusIssue> _issues = [];
  bool _isLoading = false;

  List<CampusIssue> get issues => _issues;
  bool get isLoading => _isLoading;

  CampusIssueProvider() {
    _initSocketListeners();
    _socketService.joinRoom('campus');
  }

  void _initSocketListeners() {
    _socketService.on('issueCreated', (_) => fetchIssues());
    _socketService.on('supportChanged', (_) => fetchIssues());
    _socketService.on('statusUpdated', (_) => fetchIssues());
  }

  Future<void> fetchIssues() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _api.get('/campus-environment/my');
      final data = response.data;
      if (data is List) {
        _issues = data.map((e) => CampusIssue.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        _issues = [];
      }
    } catch (e) {
      debugPrint('Error fetching campus issues: $e');
      _issues = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> supportIssue(String issueId) async {
    try {
      await _api.post('/campus-environment/$issueId/support');
      // The socket event will trigger a fetchIssues()
      // But we can also proactively update the local state for immediate feedback
      final index = _issues.indexWhere((issue) => issue.id == issueId);
      if (index != -1) {
        // Just as an optimistic update
        // (Assuming supportCount increases by 1 for simplicity)
        // _issues[index] = CampusIssue(..., supportCount: _issues[index].supportCount + 1);
        // Better to rely on socket or just re-fetch
        await fetchIssues();
      }
    } catch (e) {
      debugPrint('Error supporting campus issue: $e');
      rethrow;
    }
  }

  @override
  void dispose() {
    // If needed, remove specific listeners but SocketService might handle it globally
    super.dispose();
  }
}
