import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import '../models/campus_complaint.dart';
import 'api_service.dart';

class CampusEnvironmentService {
  final ApiService _apiService = ApiService();

  Future<List<CampusComplaint>> getAllComplaints() async {
    try {
      final response = await _apiService.get('/campus-environment');
      final List data = response.data;
      return data.map((item) => CampusComplaint.fromJson(item)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<CampusComplaint>> getMyComplaints() async {
    try {
      final response = await _apiService.get('/campus-environment/my');
      final List data = response.data;
      return data.map((item) => CampusComplaint.fromJson(item)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<CampusComplaint> getComplaintDetails(String id) async {
    try {
      final response = await _apiService.get('/campus-environment/$id');
      return CampusComplaint.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<ComplaintTracking>> getTrackingHistory(String id) async {
    try {
      final response = await _apiService.get('/campus-environment/$id/tracking');
      final List data = response.data;
      return data.map((item) => ComplaintTracking.fromJson(item)).toList();
    } catch (e) {
      rethrow;
    }
  }

  Future<List<IssueType>> getIssueTypes() async {
    try {
      final response = await _apiService.get('/campus-environment/issue-types');
      final List data = response.data;
      return data.map((item) => IssueType.fromJson(item)).toList();
    } catch (e) {
      rethrow;
    }
  }

  // Submit a campus complaint without location field
Future<void> submitComplaint({
  required String issueType,
  required String title,
  required String description,
  List<XFile>? images,
}) async {
  try {
    // Debug log request data (location removed)
    debugPrint('Submitting complaint with title: $title, issueType: $issueType');

    // Resolve issueType if it's a placeholder for a new category
    String resolvedIssueTypeId = issueType;
    if (issueType == 'other') {
      // Use the provided title as the new issue name
      final issueTypes = await getIssueTypes();
      IssueType? existing;
      for (var t in issueTypes) {
        if (t.issueName.toLowerCase() == title.toLowerCase()) {
          existing = t;
          break;
        }
      }
      if (existing != null) {
        resolvedIssueTypeId = existing.id;
      } else {
        // Create new issue type via API
        final createResp = await _apiService.post('/campus-environment/issue-types', data: {
          'issueName': title,
        });
        resolvedIssueTypeId = createResp.data['_id'];
      }
    }
    final formData = FormData.fromMap({
      'issueType': resolvedIssueTypeId,
      'title': title,
      'description': description,
    });
    // Note: location field omitted as per requirements
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

    await _apiService.post('/campus-environment', data: formData);
  } on DioException catch (dioError) {
    // Log response for debugging
    debugPrint('Complaint submission response status: ${dioError.response?.statusCode}');
    // Extract friendly message based on status code
    final status = dioError.response?.statusCode;
    String message = 'Something went wrong. Please try again later.';
    if (status == 409) {
      message = dioError.response?.data['message'] ??
          'Sorry, this issue has already been reported. Please support the existing complaint instead.';
    } else if (status == 401) {
      message = 'Session expired. Please log in again.';
    } else if (status == 500) {
      message = 'Something went wrong. Please try again later.';
    } else if (dioError.type == DioExceptionType.connectionError) {
      message = 'Please check your internet connection.';
    }
    // Throw as a generic Exception with friendly message
    throw Exception(message);
  } catch (e) {
    // Re‑throw any other unexpected errors
    rethrow;
  }
}


  Future<int> supportComplaint(String id) async {
    try {
      final response = await _apiService.post('/campus-environment/$id/support');
      return response.data['supportCount'];
    } catch (e) {
      rethrow;
    }
  }

  Future<int> removeSupport(String id) async {
    try {
      final response = await _apiService.delete('/campus-environment/$id/support');
      return response.data['supportCount'];
    } catch (e) {
      rethrow;
    }
  }
  Future<void> updateStatus(String id, String status, String note) async {
    try {
      await _apiService.put('/campus-environment/$id/status', data: {
        'status': status,
        'note': note,
      });
    } catch (e) {
      rethrow;
    }
  }

  Future<void> assignComplaint(String id, String staffId) async {
    try {
      await _apiService.put('/campus-environment/$id/assign', data: {
        'staffId': staffId,
      });
    } catch (e) {
      rethrow;
    }
  }
}
