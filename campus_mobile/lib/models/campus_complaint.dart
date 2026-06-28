import '../core/constants.dart';

class CampusComplaint {
  final String id;
  final String issueType;
  final String description;
  final List<String> images;
  final String location;
  final String? faculty;
  final String? department;
  final String status;
  final int supportCount;
  final DateTime createdAt;
  final StudentSummary student;
  final String? assignedTo;

  List<String> get fullImageUrls {
    return images.map((img) => AppConstants.getImageUrl(img)).toList();
  }

  CampusComplaint({
    required this.id,
    required this.issueType,
    required this.description,
    required this.images,
    required this.location,
    this.faculty,
    this.department,
    required this.status,
    required this.supportCount,
    required this.createdAt,
    required this.student,
    this.assignedTo,
  });

  factory CampusComplaint.fromJson(Map<String, dynamic> json) {
    return CampusComplaint(
      id: json['_id'] ?? '',
      issueType: json['issueType'] is Map 
          ? json['issueType']['issueName'] ?? 'Unknown' 
          : 'Unknown',
      description: json['description'] ?? '',
      images: List<String>.from(json['images'] ?? []),
      location: json['location'] ?? '',
      faculty: json['faculty'],
      department: json['department'],
      status: json['status'] ?? 'pending',
      supportCount: json['supportCount'] ?? 0,
      createdAt: DateTime.parse(json['createdAt']),
      student: StudentSummary.fromJson(json['student'] ?? {}),
      assignedTo: json['assignedTo'] is Map ? json['assignedTo']['fullName'] : null,
    );
  }
}

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

class ComplaintTracking {
  final String oldStatus;
  final String newStatus;
  final String? note;
  final String changedBy;
  final DateTime createdAt;

  ComplaintTracking({
    required this.oldStatus,
    required this.newStatus,
    this.note,
    required this.changedBy,
    required this.createdAt,
  });

  factory ComplaintTracking.fromJson(Map<String, dynamic> json) {
    return ComplaintTracking(
      oldStatus: json['oldStatus'] ?? '',
      newStatus: json['newStatus'] ?? '',
      note: json['note'],
      changedBy: json['changedBy'] is Map ? json['changedBy']['fullName'] : 'System',
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class IssueType {
  final String id;
  final String issueName;
  final String category;

  IssueType({
    required this.id,
    required this.issueName,
    required this.category,
  });

  factory IssueType.fromJson(Map<String, dynamic> json) {
    return IssueType(
      id: json['_id'] ?? '',
      issueName: json['issueName'] ?? '',
      category: json['category'] ?? '',
    );
  }
}
