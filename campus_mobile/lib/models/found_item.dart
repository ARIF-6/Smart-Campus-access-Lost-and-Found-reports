import '../core/constants.dart';

class FoundItem {
  final String id;
  final String title;
  final String description;
  final String category;
  final String location;
  final String? imageUrl;
  final String status;
  final DateTime dateFound;
  final String foundBy;
  final DateTime? returnedAt;
  final DateTime? updatedAt;
  final bool isClaimedByUser;
  final bool isRejectedByUser;
  final ReturnedStudent? currentReturnedStudent;

  FoundItem({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    this.imageUrl,
    required this.status,
    required this.dateFound,
    required this.foundBy,
    this.returnedAt,
    this.updatedAt,
    this.isClaimedByUser = false,
    this.isRejectedByUser = false,
    this.currentReturnedStudent,
  });

  String get fullImageUrl => AppConstants.getImageUrl(imageUrl);

  factory FoundItem.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic date) {
      if (date == null) return DateTime.now();
      try {
        return DateTime.parse(date.toString());
      } catch (_) {
        return DateTime.now();
      }
    }

    DateTime? parseNullableDate(dynamic date) {
      if (date == null) return null;
      try {
        return DateTime.parse(date.toString());
      } catch (_) {
        return null;
      }
    }

    return FoundItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Untitled Item').toString(),
      description: (json['description'] ?? '').toString(),
      category: (json['category'] ?? 'General').toString(),
      location: (json['location'] ?? json['locationFound'] ?? 'Campus').toString(),
      imageUrl: (json['imageUrl'] ?? json['image'] ?? '').toString(),
      status: (json['status'] ?? 'pending').toString(),
      dateFound: parseDate(json['dateFound']),
      foundBy: (json['foundBy'] is Map 
          ? json['foundBy']['_id'] ?? json['foundBy']['id'] 
          : json['createdBy'] is Map 
              ? json['createdBy']['_id'] ?? json['createdBy']['id'] 
              : json['foundBy'] ?? json['createdBy'] ?? '').toString(),
      returnedAt: parseNullableDate(json['returnedAt']),
      updatedAt: parseNullableDate(json['updatedAt']),
      isClaimedByUser: json['isClaimedByUser'] == true,
      isRejectedByUser: json['isRejectedByUser'] == true,
      currentReturnedStudent: json['currentReturnedStudent'] is Map
          ? ReturnedStudent.fromJson(json['currentReturnedStudent'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'location': location,
      'imageUrl': imageUrl,
      'status': status,
      'dateFound': dateFound.toIso8601String(),
      'foundBy': foundBy,
      'returnedAt': returnedAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'isClaimedByUser': isClaimedByUser,
      'isRejectedByUser': isRejectedByUser,
      'currentReturnedStudent': currentReturnedStudent?.toJson(),
    };
  }
}

class ReturnedStudent {
  final String fullName;
  final String studentId;
  final String? faculty;
  final String? department;
  final String? classField;
  final DateTime? returnedAt;

  ReturnedStudent({
    required this.fullName,
    required this.studentId,
    this.faculty,
    this.department,
    this.classField,
    this.returnedAt,
  });

  factory ReturnedStudent.fromJson(Map<String, dynamic> json) {
    return ReturnedStudent(
      fullName: (json['fullName'] ?? '').toString(),
      studentId: (json['studentId'] ?? '').toString(),
      faculty: json['faculty'] is Map ? (json['faculty']['name'] ?? json['faculty']['_id'])?.toString() : json['faculty']?.toString(),
      department: json['department'] is Map ? (json['department']['name'] ?? json['department']['_id'])?.toString() : json['department']?.toString(),
      classField: json['class'] is Map ? (json['class']['name'] ?? json['class']['_id'])?.toString() : json['class']?.toString(),
      returnedAt: json['returnedAt'] != null ? DateTime.tryParse(json['returnedAt'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'fullName': fullName,
      'studentId': studentId,
      'faculty': faculty,
      'department': department,
      'class': classField,
      'returnedAt': returnedAt?.toIso8601String(),
    };
  }
}
