import 'package:flutter/material.dart';
import '../../models/class_issue.dart';
import '../../services/class_issue_service.dart';
import '../../core/constants.dart';
import '../../providers/class_issue_provider.dart';
import '../../providers/auth_provider.dart';
import 'image_viewer_screen.dart';
import 'package:provider/provider.dart';

class ClassIssueDetailsScreen extends StatefulWidget {
  final String issueId;
  const ClassIssueDetailsScreen({super.key, required this.issueId});

  @override
  State<ClassIssueDetailsScreen> createState() => _ClassIssueDetailsScreenState();
}

class _ClassIssueDetailsScreenState extends State<ClassIssueDetailsScreen> {
  final _service = ClassIssueService();
  late Future<ClassIssue> _issueFuture;
  late Future<List<ClassIssueTracking>> _trackingFuture;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  void _refreshData() {
    setState(() {
      _issueFuture = _service.getIssueDetails(widget.issueId);
      _trackingFuture = _service.getTrackingHistory(widget.issueId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Issue Details', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black,
        actions: [
          IconButton(onPressed: _refreshData, icon: const Icon(Icons.refresh_rounded)),
        ],
      ),
      body: FutureBuilder<ClassIssue>(
        future: _issueFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}'));
          final issue = snapshot.data!;

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (issue.fullImageUrls.isNotEmpty)
                  SizedBox(
                    height: 250,
                    child: Stack(
                      children: [
                        PageView.builder(
                          itemCount: issue.fullImageUrls.length,
                          itemBuilder: (context, index) {
                            final imageUrl = issue.fullImageUrls[index];
                            return GestureDetector(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ImageViewerScreen(
                                      imageUrls: issue.fullImageUrls,
                                      initialIndex: index,
                                    ),
                                  ),
                                );
                              },
                              child: Image.network(
                                imageUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  color: Colors.grey.shade200,
                                  child: const Icon(Icons.broken_image, size: 48, color: Colors.grey),
                                ),
                              ),
                            );
                          },
                        ),
                        if (issue.fullImageUrls.length > 1)
                          Positioned(
                            bottom: 12,
                            right: 12,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${issue.fullImageUrls.length} images attached',
                                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                      ],
                    ),
                  )
                else
                  Container(
                    height: 200, width: double.infinity, color: Colors.grey.shade50,
                    child: const Icon(Icons.business_outlined, size: 64, color: Colors.grey),
                  ),

                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildStatusBadge(issue.status),
                          Text(
                            "${issue.createdAt.day}/${issue.createdAt.month}/${issue.createdAt.year}",
                            style: const TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Reporter: ${issue.student.fullName}',
                              style: const TextStyle(fontSize: 13, color: Colors.black87),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Category: ${issue.issueType}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.deepPurple),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          _buildInfoChip(Icons.business_outlined, issue.building),
                          const SizedBox(width: 12),
                          _buildInfoChip(Icons.room_outlined, issue.classroom),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Supports: ${issue.supportCount}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                          Builder(
                            builder: (context) {
                              final authProvider = Provider.of<AuthProvider>(context, listen: false);
                              final bool isOwner = issue.student.id == (authProvider.user?['_id'] ?? '');
                              final bool isSupportDisabled = issue.status != 'pending' || isOwner;
                              return isSupportDisabled
                                  ? ElevatedButton.icon(
                                      onPressed: () {
                                        final message = isOwner
                                            ? "Cannot support your own complaint because you are the person who reported this issue."
                                            : "Support is only available while the issue is pending.";
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(content: Text(message), backgroundColor: Colors.redAccent),
                                        );
                                      },
                                      icon: const Icon(Icons.thumb_up_alt_outlined),
                                      label: Text(isOwner ? "Your Issue" : "Cannot Support"),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.grey,
                                        foregroundColor: Colors.white,
                                      ),
                                    )
                                  : ElevatedButton.icon(
                                      onPressed: () async {
                                        final provider = Provider.of<ClassIssueProvider>(context, listen: false);
                                        final success = await provider.supportIssue(issue.id);
                                        if (success) {
                                          _refreshData();
                                        }
                                      },
                                      icon: const Icon(Icons.thumb_up_alt_outlined),
                                      label: const Text('Support'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppConstants.primaryColor,
                                        foregroundColor: Colors.white,
                                      ),
                                    );
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      
                      const Text('Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      Text(issue.description, style: TextStyle(color: Colors.grey.shade700, height: 1.5)),
                      const SizedBox(height: 32),
                      
                      const Text('Tracking History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      const SizedBox(height: 20),
                      FutureBuilder<List<ClassIssueTracking>>(
                        future: _trackingFuture,
                        builder: (context, trackSnapshot) {
                          if (!trackSnapshot.hasData) return const SizedBox();
                          final tracking = trackSnapshot.data!;
                          return ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: tracking.length,
                            itemBuilder: (context, index) => _buildTimelineItem(tracking[index], index == tracking.length - 1),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade100)),
      child: Row(
        children: [
          Icon(icon, size: 14, color: Colors.grey),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87)),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(ClassIssueTracking item, bool isLast) {
    return IntrinsicHeight(
      child: Row(
        children: [
          Column(
            children: [
              Container(width: 10, height: 10, decoration: const BoxDecoration(color: AppConstants.primaryColor, shape: BoxShape.circle)),
              if (!isLast) Expanded(child: Container(width: 2, color: Colors.grey.shade200)),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(item.newStatus.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, color: AppConstants.primaryColor, fontSize: 12)),
                      Text("${item.createdAt.hour}:${item.createdAt.minute}", style: const TextStyle(color: Colors.grey, fontSize: 10)),
                    ],
                  ),
                  if (item.note != null) ...[
                    const SizedBox(height: 4),
                    Text('"${item.note}"', style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey.shade600, fontSize: 13)),
                  ],
                  const SizedBox(height: 4),
                  Text('By ${item.changedBy}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status) {
      case 'pending':
        color = Colors.black87;
        break;
      case 'in_review':
        color = Colors.blue;
        break;
      case 'resolved':
        color = Colors.green;
        break;
      case 'rejected':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        status.replaceFirst('_', ' ').toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
