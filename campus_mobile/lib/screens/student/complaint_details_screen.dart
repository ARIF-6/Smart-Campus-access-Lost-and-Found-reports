import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/campus_complaint.dart';
import '../../services/campus_environment_service.dart';
import '../../core/constants.dart';

class ComplaintDetailsScreen extends StatefulWidget {
  final String complaintId;
  const ComplaintDetailsScreen({super.key, required this.complaintId});

  @override
  State<ComplaintDetailsScreen> createState() => _ComplaintDetailsScreenState();
}

class _ComplaintDetailsScreenState extends State<ComplaintDetailsScreen> {
  final _service = CampusEnvironmentService();
  late Future<CampusComplaint> _complaintFuture;
  late Future<List<ComplaintTracking>> _trackingFuture;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  void _refreshData() {
    setState(() {
      _complaintFuture = _service.getComplaintDetails(widget.complaintId);
      _trackingFuture = _service.getTrackingHistory(widget.complaintId);
    });
  }

  Future<void> _handleSupport(String id) async {
    try {
      await _service.supportComplaint(id);
      _refreshData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('You already supported this complaint')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Complaint Details', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: Colors.black,
        actions: [
          IconButton(
            onPressed: _refreshData,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: FutureBuilder<CampusComplaint>(
        future: _complaintFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final complaint = snapshot.data!;

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (complaint.fullImageUrls.isNotEmpty)
                  SizedBox(
                    height: 250,
                    child: PageView.builder(
                      itemCount: complaint.fullImageUrls.length,
                      itemBuilder: (context, index) {
                        return Image.network(
                          complaint.fullImageUrls[index],
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: Colors.grey.shade100,
                            child: const Icon(Icons.image_not_supported_outlined, size: 50, color: Colors.grey),
                          ),
                        );
                      },
                    ),
                  )
                else
                  Container(
                    height: 200,
                    width: double.infinity,
                    color: Colors.grey.shade50,
                    child: const Icon(Icons.image_outlined, size: 64, color: Colors.grey),
                  ),

                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildStatusBadge(complaint.status),
                          Text(
                            DateFormat('MMM d, yyyy').format(complaint.createdAt),
                            style: const TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        complaint.issueType,
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 16, color: AppConstants.primaryColor),
                          const SizedBox(width: 4),
                          Text(complaint.location, style: const TextStyle(color: Colors.grey)),
                        ],
                      ),
                      const SizedBox(height: 24),
                      const Text('Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      Text(
                        complaint.description,
                        style: TextStyle(color: Colors.grey.shade700, height: 1.5),
                      ),
                      const SizedBox(height: 32),
                      
                      // Support Button
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppConstants.primaryColor.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${complaint.supportCount} Supports',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                                  ),
                                  const Text('Help prioritize this issue', style: TextStyle(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: () => _handleSupport(complaint.id),
                              icon: const Icon(Icons.thumb_up_alt_outlined, size: 18, color: Colors.white),
                              label: const Text('Support', style: TextStyle(color: Colors.white)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppConstants.primaryColor,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 0,
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 40),
                      const Text('Tracking Timeline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      const SizedBox(height: 20),
                      
                      FutureBuilder<List<ComplaintTracking>>(
                        future: _trackingFuture,
                        builder: (context, trackSnapshot) {
                          if (!trackSnapshot.hasData) return const SizedBox();
                          final tracking = trackSnapshot.data!;
                          if (tracking.isEmpty) {
                            return const Text('No updates yet.', style: TextStyle(color: Colors.grey));
                          }
                          return ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: tracking.length,
                            itemBuilder: (context, index) {
                              final item = tracking[index];
                              return _buildTimelineItem(item, index == tracking.length - 1);
                            },
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

  Widget _buildTimelineItem(ComplaintTracking item, bool isLast) {
    return IntrinsicHeight(
      child: Row(
        children: [
          Column(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(color: AppConstants.primaryColor, shape: BoxShape.circle),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: Colors.grey.shade200,
                  ),
                ),
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
                      Text(
                        item.newStatus.toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppConstants.primaryColor, fontSize: 12),
                      ),
                      Text(
                         DateFormat('MMM d, HH:mm').format(item.createdAt),
                        style: const TextStyle(color: Colors.grey, fontSize: 10),
                      ),
                    ],
                  ),
                  if (item.note != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      '"${item.note}"',
                      style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey.shade600, fontSize: 13),
                    ),
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
      case 'pending': color = Colors.amber; break;
      case 'in_review': color = Colors.blue; break;
      case 'resolved': color = Colors.green; break;
      case 'completed': color = Colors.green; break;
      case 'rejected': color = Colors.red; break;
      default: color = Colors.grey;
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
