import '../core/constants.dart';

class ItemModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String type;
  final String location;
  final String? image;
  final String status;
  final DateTime createdAt;
  final String? itemSource;

  ItemModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.type,
    required this.location,
    this.image,
    required this.status,
    required this.createdAt,
    this.itemSource,
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
      createdAt: json['createdAt'] != null 
          ? DateTime.parse(json['createdAt']) 
          : DateTime.now(),
      itemSource: json['itemSource'],
    );
  }

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
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
