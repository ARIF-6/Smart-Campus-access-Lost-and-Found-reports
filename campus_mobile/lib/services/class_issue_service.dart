import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../models/class_issue.dart';
import 'api_service.dart';

class ClassIssueService {
  final ApiService _apiService = ApiService();

  // Admin: get ALL issues across all classes
  Future<List<ClassIssue>> getAllIssues() async {
    try {
      final response = await _apiService.get('/class-issues/all');
      // Interceptor already unwrapped; getAllIssues returns { issues:[...], totalPages,... }
      final dynamic payload = response.data;
      final List data = payload is Map
          ? (payload['issues'] as List? ?? [])
          : (payload is List ? payload : []);
      return data.map((item) {
        if (item is Map) {
          return ClassIssue.fromJson(Map<String, dynamic>.from(item));
        }
        return null;
      }).where((e) => e != null).cast<ClassIssue>().toList();
    } catch (e) {
      rethrow;
    }
  }

  // Student: get issues for the logged-in user's class
  Future<List<ClassIssue>> getMyIssues() async {
    try {
      final response = await _apiService.get('/class-issues');
      // Interceptor already unwrapped; getMyIssues returns a plain list
      final List data = response.data is List ? response.data as List : [];
      return data.map((item) {
        if (item is Map) {
          return ClassIssue.fromJson(Map<String, dynamic>.from(item));
        }
        return null;
      }).where((e) => e != null).cast<ClassIssue>().toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<ClassIssue> getIssueDetails(String id) async {
    try {
      final response = await _apiService.get('/class-issues/$id');
      // Interceptor already unwrapped; returns the issue object directly
      return ClassIssue.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ClassIssueTracking>> getTrackingHistory(String id) async {
    try {
      final response = await _apiService.get('/class-issues/$id/tracking');
      // Interceptor already unwrapped; returns plain list
      final List data = response.data is List ? response.data as List : [];
      return data.map((item) => ClassIssueTracking.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ClassIssueType>> getIssueTypes() async {
    try {
      final response = await _apiService.get('/class-issues/issue-types');
      // Interceptor already unwrapped; returns plain list
      final List data = response.data is List ? response.data as List : [];
      return data.map((item) => ClassIssueType.fromJson(item as Map<String, dynamic>)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, String>> getMyLocation() async {
    try {
      final response = await _apiService.get('/class-issues/my-location');
      final data = response.data;
      if (data is Map) {
        return {
          'className': data['className']?.toString() ?? 'Unknown Class',
          'hallName': data['hallName']?.toString() ?? 'Unknown Hall',
        };
      }
      return {'className': 'Unknown Class', 'hallName': 'Unknown Hall'};
    } catch (e) {
      return {'className': 'Unknown Class', 'hallName': 'Unknown Hall'};
    }
  }

  Future<void> submitIssue({
    required String issueType,
    required String title,
    required String description,
    required String classroom,
    required String building,
    List<XFile>? images,
  }) async {
    try {
      final formData = FormData.fromMap({
        'issueType': issueType,
        'title': title,
        'description': description,
        'classroom': classroom,
        'building': building,
      });

      if (images != null && images.isNotEmpty) {
        for (var image in images) {
          if (kIsWeb) {
            final bytes = await image.readAsBytes();
            formData.files.add(MapEntry(
              'images',
              MultipartFile.fromBytes(bytes, filename: image.name),
            ));
          } else {
            formData.files.add(MapEntry(
              'images',
              await MultipartFile.fromFile(image.path, filename: image.name),
            ));
          }
        }
      }

      await _apiService.post('/class-issues', data: formData);
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateStatus(String id, String status, String note) async {
    try {
      await _apiService.put('/class-issues/$id/status', data: {
        'status': status,
        'note': note,
      });
    } catch (e) {
      rethrow;
    }
  }

  Future<void> assignIssue(String id, String staffId) async {
    try {
      await _apiService.put('/class-issues/$id/assign', data: {
        'assignedTo': staffId,
      });
    } catch (e) {
      rethrow;
    }
  }
}
