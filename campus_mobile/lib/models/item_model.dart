import '../core/constants.dart';
import 'found_item.dart';

class ItemModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String type;
  final String location;
  final String? image;
  final String status;
  final String? displayStatus;
  final DateTime createdAt;
  final String? itemSource;
  final ReturnedStudent? currentReturnedStudent;

  ItemModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.type,
    required this.location,
    this.image,
    required this.status,
    this.displayStatus,
    required this.createdAt,
    this.itemSource,
    this.currentReturnedStudent,
  });

  factory ItemModel.fromJson(Map<String, dynamic> json) {
    return ItemModel(
      id: json['_id'] ?? '',
      title: json['title'] ?? 'Untitled Item',
      description: json['description'] ?? '',
      category: json['category'] ?? 'Other',
      type: json['type'] ?? 'lost',
      location: json['location'] ?? 'Unknown',
      image: json['image'] ?? json['imageUrl'],
      status: json['status'] ?? 'pending',
      displayStatus: json['displayStatus']?.toString(),
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      itemSource: json['itemSource'],
      currentReturnedStudent: json['currentReturnedStudent'] is Map
          ? ReturnedStudent.fromJson(json['currentReturnedStudent'] as Map<String, dynamic>)
          : null,
    );
  }

  String get statusLabel => displayStatus ?? status;

  String get getImageUrl {
    // Use the centralized helper to construct a proper URL.
    // It handles nulls, external URLs, path normalization and the required
    // '/uploads' prefix, ensuring consistency with other parts of the app.
    return AppConstants.getImageUrl(image);
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'type': type,
      'location': location,
      'image': image,
      'status': status,
      'displayStatus': displayStatus,
      'createdAt': createdAt.toIso8601String(),
      'currentReturnedStudent': currentReturnedStudent?.toJson(),
    };
  }
}
