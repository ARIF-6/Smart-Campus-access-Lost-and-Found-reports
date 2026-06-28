// lib/models/campus_issue.dart

class CampusIssue {
  final String id;
  final String title;
  final String description;
  final String imageUrl;
  final List<String> images;
  final String location;
  final String reporterType;
  final String status; // Pending, In Progress, Resolved, Closed
  final int supportCount;
  final DateTime createdAt;

  final String? studentId;
  final String? studentEmail;

  CampusIssue({
    required this.id,
    required this.title,
    required this.description,
    required this.imageUrl,
    required this.images,
    required this.location,
    required this.reporterType,
    required this.status,
    required this.supportCount,
    required this.createdAt,
    this.studentId,
    this.studentEmail,
  });

  factory CampusIssue.fromJson(Map<String, dynamic> json) {
    List<String> parsedImages = [];
    if (json['images'] != null && json['images'] is List) {
      parsedImages = List<String>.from(json['images']);
    }

    String? parsedStudentId;
    String? parsedStudentEmail;
    if (json['student'] != null && json['student'] is Map) {
      parsedStudentId = json['student']['studentId']?.toString();
      parsedStudentEmail = json['student']['email']?.toString();
    }

    return CampusIssue(
      id: json['_id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      imageUrl: parsedImages.isNotEmpty ? parsedImages[0] : (json['imageUrl'] ?? ''),
      images: parsedImages,
      location: json['location'] ?? '',
      reporterType: json['reporterType'] ?? '',
      status: json['status'] ?? 'Pending',
      supportCount: json['supportCount'] ?? 0,
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      studentId: parsedStudentId,
      studentEmail: parsedStudentEmail,
    );
  }
}
