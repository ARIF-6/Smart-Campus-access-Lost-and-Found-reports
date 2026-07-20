import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/constants.dart';
import '../screens/student/image_viewer_screen.dart';

class IssueCard extends StatefulWidget {
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
  final bool hasUserSupported;

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
    this.hasUserSupported = false,
  });

  @override
  State<IssueCard> createState() => _IssueCardState();
}

class _IssueCardState extends State<IssueCard> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
      lowerBound: 0.97,
      upperBound: 1.0,
    );
    _scaleAnim = _animController;
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Color _getStatusColor(String s) {
    switch (s.toLowerCase()) {
      case 'pending':
        return const Color(0xFFF59E0B); // Amber
      case 'resolved':
      case 'closed':
        return const Color(0xFF10B981); // Emerald Green
      case 'rejected':
        return const Color(0xFFEF4444); // Crimson/Red
      case 'in progress':
        return const Color(0xFF6366F1); // Indigo
      default:
        return const Color(0xFF3B82F6); // Blue
    }
  }

  @override
  Widget build(BuildContext context) {
    final isActive = widget.hasUserSupported && !widget.isSupportDisabled;
    final statusColor = _getStatusColor(widget.status);

    return GestureDetector(
      onTapDown: (_) => _animController.reverse(),
      onTapUp: (_) {
        _animController.forward();
        widget.onSeeDetails();
      },
      onTapCancel: () => _animController.forward(),
      child: ScaleTransition(
        scale: _scaleAnim,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Stack(
              children: [
                // Accent left border bar
                Positioned(
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  child: Container(color: statusColor),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(width: 8),
                      // Image on the left
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: widget.imageUrl.isNotEmpty
                            ? GestureDetector(
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ImageViewerScreen(
                                        imageUrls: [widget.imageUrl],
                                        initialIndex: 0,
                                      ),
                                    ),
                                  );
                                },
                                child: Hero(
                                  tag: widget.imageUrl,
                                  child: Image.network(
                                    widget.imageUrl,
                                    width: 76,
                                    height: 76,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      width: 76,
                                      height: 76,
                                      color: Colors.grey.shade50,
                                      child: Icon(Icons.image_not_supported_rounded,
                                          color: Colors.grey.shade300, size: 28),
                                    ),
                                  ),
                                ),
                              )
                            : Container(
                                width: 76,
                                height: 76,
                                color: Colors.grey.shade50,
                                child: Icon(Icons.image_not_supported_rounded,
                                    color: Colors.grey.shade300, size: 28),
                              ),
                      ),
                      const SizedBox(width: 16),
                      // Content area
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    widget.title,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF1E293B),
                                      letterSpacing: -0.3,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: statusColor.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    widget.status.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w900,
                                      color: statusColor,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 5),
                            Text(
                              widget.subtitle,
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xFF64748B),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              DateFormat('MMM d, y • h:mm a').format(widget.createdAt),
                              style: const TextStyle(
                                fontSize: 11,
                                color: Color(0xFF94A3B8),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              widget.description,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF475569),
                                height: 1.4,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: widget.isSupportDisabled ? null : widget.onSupport,
                                    borderRadius: BorderRadius.circular(16),
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 200),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: widget.isSupportDisabled
                                            ? Colors.grey.shade50
                                            : isActive
                                                ? AppConstants.primaryColor
                                                : AppConstants.primaryColor.withOpacity(0.06),
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(
                                          color: widget.isSupportDisabled
                                              ? Colors.grey.shade200
                                              : isActive
                                                  ? AppConstants.primaryColor
                                                  : AppConstants.primaryColor.withOpacity(0.12),
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(
                                            isActive ? Icons.thumb_up_rounded : Icons.thumb_up_outlined,
                                            size: 15,
                                            color: widget.isSupportDisabled
                                                ? Colors.grey.shade400
                                                : isActive
                                                    ? Colors.white
                                                    : AppConstants.primaryColor,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            widget.isSupportDisabled
                                                ? (widget.isOwner ? 'Your Issue' : 'Closed')
                                                : '${widget.supportCount}',
                                            style: TextStyle(
                                              fontSize: 12.5,
                                              fontWeight: FontWeight.w800,
                                              color: widget.isSupportDisabled
                                                  ? Colors.grey.shade400
                                                  : isActive
                                                      ? Colors.white
                                                      : AppConstants.primaryColor,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                Row(
                                  children: [
                                    const Text(
                                      'View details',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w800,
                                        color: AppConstants.primaryColor,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      size: 12,
                                      color: AppConstants.primaryColor,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
