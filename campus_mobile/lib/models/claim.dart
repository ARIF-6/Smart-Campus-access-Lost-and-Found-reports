import '../core/constants.dart';

class Claim {
  final String id;
  final String itemId;
  final String itemTitle;
  final String? itemImage;
  final String? itemCategory;
  final String? itemLocation;
  final String studentId;
  final String description;
  final String? proofImage;
  final String status;
  final DateTime createdAt;

  String get fullItemImageUrl => AppConstants.getImageUrl(itemImage);

  String get fullProofImageUrl => AppConstants.getImageUrl(proofImage);

  Claim({
    required this.id,
    required this.itemId,
    required this.itemTitle,
    this.itemImage,
    this.itemCategory,
    this.itemLocation,
    required this.studentId,
    required this.description,
    this.proofImage,
    required this.status,
    required this.createdAt,
  });

  factory Claim.fromJson(Map<String, dynamic> json) {
    return Claim(
      id: json['_id'] ?? json['id'] ?? '',
      itemId: json['item']?['_id'] ?? json['itemId'] ?? '',
      itemTitle: json['item']?['title'] ?? json['itemTitle'] ?? 'Unknown Item',
      itemImage: json['item']?['image'] ?? json['item']?['imageUrl'],
      itemCategory: json['item']?['category'],
      itemLocation: json['item']?['location'],
      studentId: json['student']?['_id'] ?? json['studentId'] ?? '',
      description: json['message'] ?? json['description'] ?? '',
      proofImage: json['proofImage'] ?? json['proof'],
      status: json['status'] ?? 'pending',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'itemId': itemId,
      'itemTitle': itemTitle,
      'itemImage': itemImage,
      'itemCategory': itemCategory,
      'itemLocation': itemLocation,
      'studentId': studentId,
      'description': description,
      'proofImage': proofImage,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
