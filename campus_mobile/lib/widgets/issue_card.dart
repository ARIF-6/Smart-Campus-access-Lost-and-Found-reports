import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/constants.dart';
import '../screens/student/image_viewer_screen.dart';

class IssueCard extends StatelessWidget {
  final String title;
  final String description;
  final String imageUrl;
  final String subtitle;
  final String status;
  final int supportCount;
  final DateTime createdAt;
  final VoidCallback onSupport;
  final VoidCallback onSeeDetails;
  final bool isSupportDisabled;
  final bool isOwner;

  const IssueCard({
    super.key,
    required this.title,
    required this.description,
    required this.imageUrl,
    required this.subtitle,
    required this.status,
    required this.supportCount,
    required this.createdAt,
    required this.onSupport,
    required this.onSeeDetails,
    this.isSupportDisabled = false,
    this.isOwner = false,
  });

  Color _getStatusColor(String s) {
    switch (s.toLowerCase()) {
      case 'pending':
        return Colors.black87;
      case 'resolved':
      case 'closed':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'in progress':
        return Colors.orange;
      default:
        return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Container(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image on the left with Hero and tap to preview
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: imageUrl.isNotEmpty
                  ? GestureDetector(
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ImageViewerScreen(
                              imageUrls: [imageUrl],
                              initialIndex: 0,
                            ),
                          ),
                        );
                      },
                      child: Hero(
                        tag: imageUrl,
                        child: Image.network(
                          imageUrl,
                          width: 70,
                          height: 70,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 70,
                            height: 70,
                            color: Colors.grey.shade200,
                            child: Icon(Icons.image_not_supported_rounded,
                                color: Colors.grey.shade400, size: 30),
                          ),
                        ),
                      ),
                    )
                  : Container(
                      width: 70,
                      height: 70,
                      color: Colors.grey.shade200,
                      child: Icon(Icons.image_not_supported_rounded,
                          color: Colors.grey.shade400, size: 30),
                    ),
            ),
            const SizedBox(width: 12),
            // Right side content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top: title and status badge
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E293B),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getStatusColor(status)
                              .withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(status),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  // Middle: date
                  Text(
                    DateFormat('MMM d, y • h:mm a').format(createdAt),
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey.shade500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Description limited to 2 lines
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey.shade600,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  // Bottom: support and details buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Support button
                      ElevatedButton.icon(
                        onPressed: isSupportDisabled
                            ? null
                            : onSupport,
                        icon: Icon(
                          Icons.thumb_up_rounded,
                          size: 16,
                          color: isSupportDisabled
                              ? Colors.grey
                              : AppConstants.primaryColor,
                        ),
                        label: Text(
                          isSupportDisabled
                              ? (isOwner ? "Your Issue" : "Cannot Support")
                              : "$supportCount",
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isSupportDisabled
                                ? Colors.grey
                                : AppConstants.primaryColor,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isSupportDisabled
                              ? Colors.grey.shade300
                              : AppConstants.primaryColor.withValues(alpha: 0.1),
                          foregroundColor: isSupportDisabled
                              ? Colors.grey
                              : AppConstants.primaryColor,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                      ),
                      // See Details button
                      TextButton(
                        onPressed: onSeeDetails,
                        style: TextButton.styleFrom(
                          foregroundColor: AppConstants.primaryColor,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                        child: const Text(
                          'See Details',
                          style: TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
