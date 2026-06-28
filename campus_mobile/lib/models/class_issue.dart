import '../core/constants.dart';

class StudentSummary {
  final String id;
  final String fullName;
  final String? studentId;
  final String? photoUrl;

  StudentSummary({
    required this.id,
    required this.fullName,
    this.studentId,
    this.photoUrl,
  });

  factory StudentSummary.fromJson(dynamic json) {
    if (json is String) {
      return StudentSummary(id: json, fullName: 'Unknown');
    } else if (json is Map<String, dynamic>) {
      return StudentSummary(
        id: json['_id'] ?? '',
        fullName: json['fullName'] ?? 'Unknown',
        studentId: json['studentId'],
        photoUrl: json['photoUrl'],
      );
    }
    return StudentSummary(id: '', fullName: 'Unknown');
  }
}

class ClassIssue {
  final String id;
  final String title;
  final String description;
  final String issueType;
  final List<String> images;
  final String classId; // NEW
  final String classroom;
  final String building;
  final String status;
  final int supportCount;
  final String? assignedTo;
  final DateTime createdAt;
  final StudentSummary student;

  List<String> get fullImageUrls {
    return images.map((img) => AppConstants.getImageUrl(img)).toList();
  }

  ClassIssue({
    required this.id,
    required this.title,
    required this.description,
    required this.issueType,
    required this.images,
    required this.classId,
    required this.classroom,
    required this.building,
    required this.status,
    required this.supportCount,
    this.assignedTo,
    required this.createdAt,
    required this.student,
  });

  factory ClassIssue.fromJson(Map<String, dynamic> json) {
    return ClassIssue(
      id: json['_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      issueType: json['issueType'] is Map 
          ? json['issueType']['issueName'] ?? 'Unknown' 
          : 'Unknown',
        images: (json['images'] as List?)?.map((img) {
          if (img is String) return img;
          if (img is Map) {
            if (img['url'] != null) return img['url'] as String;
            if (img['path'] != null) return img['path'] as String;
            if (img['imageUrl'] != null) return img['imageUrl'] as String;
          }
          return '';
        }).where((e) => e.isNotEmpty).cast<String>().toList() ?? [],
      classId: json['classId']?.toString() ?? (json['class'] is Map ? json['class']['id']?.toString() ?? '' : json['class']?.toString() ?? ''),
      classroom: json['classroom'] ?? '',
      building: json['building'] ?? '',
      status: json['status'] ?? 'pending',
      supportCount: json['supportCount'] ?? 0,
      assignedTo: json['assignedTo'] is Map ? json['assignedTo']['fullName'] : null,
      createdAt: DateTime.parse(json['createdAt']),
      student: StudentSummary.fromJson(json['student'] ?? {}),
    );
  }
}


class ClassIssueTracking {
  final String oldStatus;
  final String newStatus;
  final String? note;
  final String changedBy;
  final DateTime createdAt;

  ClassIssueTracking({
    required this.oldStatus,
    required this.newStatus,
    this.note,
    required this.changedBy,
    required this.createdAt,
  });

  factory ClassIssueTracking.fromJson(Map<String, dynamic> json) {
    return ClassIssueTracking(
      oldStatus: json['oldStatus'] ?? '',
      newStatus: json['newStatus'] ?? '',
      note: json['note'],
      changedBy: json['changedBy'] is Map ? json['changedBy']['fullName'] : 'System',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class ClassIssueType {
  final String id;
  final String issueName;
  final String category;

  ClassIssueType({
    required this.id,
    required this.issueName,
    required this.category,
  });

  factory ClassIssueType.fromJson(Map<String, dynamic> json) {
    return ClassIssueType(
      id: json['_id'] ?? '',
      issueName: json['issueName'] ?? '',
      category: json['category'] ?? '',
    );
  }
}
