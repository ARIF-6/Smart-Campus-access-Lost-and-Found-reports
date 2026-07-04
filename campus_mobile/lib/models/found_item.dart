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
  final bool isClaimedByUser;
  final bool isRejectedByUser;

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
    this.isClaimedByUser = false,
    this.isRejectedByUser = false,
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
      isClaimedByUser: json['isClaimedByUser'] == true,
      isRejectedByUser: json['isRejectedByUser'] == true,
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
      'isClaimedByUser': isClaimedByUser,
      'isRejectedByUser': isRejectedByUser,
    };
  }
}
