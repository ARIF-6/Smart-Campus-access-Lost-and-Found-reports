import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/notification.dart' as app_models;

class NotificationProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<app_models.Notification> _notifications = [];
  bool _isLoading = false;
  int _unreadCount = 0;

  List<app_models.Notification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  int get unreadCount => _unreadCount;

  Future<void> fetchNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.get('/notifications');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        _notifications = data.map((n) => app_models.Notification.fromJson(n)).toList();
        _unreadCount = _notifications.where((n) => !n.isRead).length;
      }
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _apiService.put('/notifications/$id/read');
      final index = _notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        _notifications[index] = _notifications[index].copyWith(isRead: true);
        _unreadCount = _notifications.where((n) => !n.isRead).length;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _apiService.put('/notifications/read-all');
      for (int i = 0; i < _notifications.length; i++) {
        _notifications[i] = _notifications[i].copyWith(isRead: true);
      }
      _unreadCount = 0;
      notifyListeners();
    } catch (e) {
      debugPrint('Error marking all notifications as read: $e');
    }
  }

  void addNotification(app_models.Notification notification) {
    // Check if notification already exists to prevent duplicates
    if (!_notifications.any((n) => n.id == notification.id)) {
      _notifications.insert(0, notification);
      _unreadCount++;
      notifyListeners();
    }
  }
}
