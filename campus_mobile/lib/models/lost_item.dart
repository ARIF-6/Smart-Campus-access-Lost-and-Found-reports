import '../core/constants.dart';

class LostItem {
  final String id;
  final String title;
  final String description;
  final String category;
  final String location;
  final String? imageUrl;
  final String status;
  final DateTime dateLost;
  final String reportedBy;

  LostItem({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.location,
    this.imageUrl,
    required this.status,
    required this.dateLost,
    required this.reportedBy,
  });

  String get fullImageUrl => AppConstants.getImageUrl(imageUrl);

  factory LostItem.fromJson(Map<String, dynamic> json) {
    return LostItem(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? 'Untitled Item',
      description: json['description'] ?? '',
      category: json['category'] ?? 'Other',
      location: json['location'] ?? 'Unknown',
      imageUrl: json['imageUrl'] ?? json['image'],
      status: json['status'] ?? 'lost',
      dateLost: json['dateLost'] != null
          ? DateTime.parse(json['dateLost'])
          : DateTime.now(),
      reportedBy: json['reportedBy'] ?? '',
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
      'dateLost': dateLost.toIso8601String(),
      'reportedBy': reportedBy,
    };
  }
}
