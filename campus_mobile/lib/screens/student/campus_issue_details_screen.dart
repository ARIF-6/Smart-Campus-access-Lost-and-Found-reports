import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../models/campus_issue.dart';
import '../../providers/auth_provider.dart';
import '../../providers/campus_issue_provider.dart';
import '../../services/socket_service.dart';

class CampusIssueDetailsScreen extends StatefulWidget {
  final String issueId;

  const CampusIssueDetailsScreen({super.key, required this.issueId});

  @override
  State<CampusIssueDetailsScreen> createState() => _CampusIssueDetailsScreenState();
}

class _CampusIssueDetailsScreenState extends State<CampusIssueDetailsScreen> {
  final ApiService _api = ApiService();
  bool _isLoading = true;
  Map<String, dynamic>? _complaintData;
  Map<String, dynamic>? _reporterData;
  List<dynamic> _trackingList = [];
  bool _isSupporting = false;

  final SocketService _socketService = SocketService();

  @override
  void initState() {
    super.initState();
    _fetchIssueDetails();
    _initSocket();
  }

  void _initSocket() {
    _socketService.on('supportChanged', (data) {
      if (data != null && data is Map && data['complaintId'] == widget.issueId) {
        if (mounted) {
          setState(() {
            if (_complaintData != null) {
              _complaintData!['supportCount'] = data['supportCount'] ?? _complaintData!['supportCount'];
            }
          });
        }
      }
    });

    _socketService.on('statusUpdated', (data) {
      if (data != null && data is Map && data['complaintId'] == widget.issueId) {
        if (mounted) {
          setState(() {
            if (_complaintData != null) {
              _complaintData!['status'] = data['status'] ?? _complaintData!['status'];
            }
          });
          _fetchIssueDetails();
        }
      }
    });
  }

  @override
  void dispose() {
    _socketService.off('supportChanged');
    _socketService.off('statusUpdated');
    super.dispose();
  }

  Future<void> _fetchIssueDetails() async {
    setState(() => _isLoading = true);
    try {
      final response = await _api.get('/campus-environment/${widget.issueId}');
      final data = response.data;
      setState(() {
        _complaintData = data;
        _reporterData = data['reporter'];
        _trackingList = data['tracking'] ?? [];
      });
    } catch (e) {
      debugPrint('Error fetching issue details: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load issue details.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _supportIssue() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final currentUser = authProvider.user;
    final isOwner = currentUser != null && _reporterData != null &&
        (currentUser['studentId'] == _reporterData!['studentId'] || currentUser['email'] == _reporterData!['email']);
    final isPending = (_complaintData?['status']?.toString() ?? 'pending').toLowerCase() == 'pending';
    
    if (isOwner || !isPending) {
      return;
    }

    setState(() => _isSupporting = true);
    try {
      final response = await _api.post('/campus-environment/${widget.issueId}/support');
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Success', style: TextStyle(fontWeight: FontWeight.bold)),
            content: const Text('Support recorded successfully.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Got It'),
              ),
            ],
          ),
        );
        setState(() {
          if (_complaintData != null) {
            _complaintData!['supportCount'] = response.data['supportCount'] ?? (_complaintData!['supportCount'] + 1);
          }
        });
        try {
          Provider.of<CampusIssueProvider>(context, listen: false).fetchIssues();
        } catch (e) {
          debugPrint('Error updating provider: $e');
        }
      }
    } catch (e) {
      debugPrint('Error supporting issue: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to record support. Please try again later.'),
            backgroundColor: AppConstants.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSupporting = false);
    }
  }

  Color _getStatusColor(String s) {
    switch (s.toLowerCase()) {
      case 'resolved':
      case 'closed':
      case 'completed':
        return Colors.green;
      case 'in_review':
      case 'in progress':
        return Colors.orange;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: AppConstants.backgroundColor,
        appBar: AppBar(title: const Text('Issue Details'), backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 0),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_complaintData == null) {
      return Scaffold(
        backgroundColor: AppConstants.backgroundColor,
        appBar: AppBar(title: const Text('Issue Details'), backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 0),
        body: const Center(child: Text('Issue not found.')),
      );
    }

    final issue = CampusIssue.fromJson(_complaintData!);

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Issue Details', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (issue.images.isNotEmpty)
              SizedBox(
                height: 250,
                child: PageView.builder(
                  itemCount: issue.images.length,
                  itemBuilder: (context, index) {
                    return Image.network(
                      AppConstants.getImageUrl(issue.images[index]),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        color: Colors.grey.shade200,
                        child: Icon(Icons.image_not_supported, size: 64, color: Colors.grey.shade400),
                      ),
                    );
                  },
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _getStatusColor(issue.status).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          issue.status.replaceAll('_', ' ').toUpperCase(),
                          style: TextStyle(
                            color: _getStatusColor(issue.status),
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      Text(
                        DateFormat('MMM dd, yyyy').format(issue.createdAt),
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    issue.title,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: 16, color: Colors.grey.shade600),
                      const SizedBox(width: 4),
                      Text(issue.location, style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    issue.description,
                    style: const TextStyle(fontSize: 16, height: 1.5, color: Colors.black87),
                  ),
                ],
              ),
            ),

            if (_reporterData != null)
              _buildSectionCard(
                title: 'Reporter Information',
                icon: Icons.person,
                content: Column(
                  children: [
                    _buildInfoRow('Name', _reporterData!['fullName'] ?? 'Unknown'),
                    _buildInfoRow('Faculty', _reporterData!['facultyName'] ?? 'N/A'),
                    _buildInfoRow('Department', _reporterData!['departmentName'] ?? 'N/A'),
                    _buildInfoRow('Class', _reporterData!['className'] ?? 'N/A'),
                    _buildInfoRow('Hall', _reporterData!['hallName'] ?? 'N/A'),
                  ],
                ),
              ),

            if (_trackingList.isNotEmpty)
              _buildSectionCard(
                title: 'Tracking Timeline',
                icon: Icons.timeline,
                content: ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _trackingList.length,
                  itemBuilder: (context, index) {
                    final track = _trackingList[index];
                    final date = DateTime.parse(track['createdAt'] ?? DateTime.now().toIso8601String());
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            children: [
                              Container(
                                width: 12,
                                height: 12,
                                decoration: const BoxDecoration(color: AppConstants.primaryColor, shape: BoxShape.circle),
                              ),
                              if (index != _trackingList.length - 1)
                                Container(width: 2, height: track['note'] != null && track['note'].isNotEmpty ? 60 : 30, color: Colors.grey.shade300),
                            ],
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Status changed to ${(track['newStatus'] ?? '').replaceAll('_', ' ')}',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                    Text(DateFormat('MMM dd HH:mm').format(date), style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                                  ],
                                ),
                                if (track['note'] != null && track['note'].toString().isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
                                    child: Text('Comment: ${track['note']}'),
                                  ),
                                ]
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -5))],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Expanded(
                child: () {
                  final authProvider = Provider.of<AuthProvider>(context, listen: false);
                  final currentUser = authProvider.user;
                  final isOwner = currentUser != null && _reporterData != null &&
                      (currentUser['studentId'] == _reporterData!['studentId'] || currentUser['email'] == _reporterData!['email']);
                  final isPending = (issue.status).toLowerCase() == 'pending';
                  final canSupport = !isOwner && isPending;

                  return ElevatedButton.icon(
                    onPressed: (canSupport && !_isSupporting) ? _supportIssue : null,
                    icon: _isSupporting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Icon(Icons.thumb_up, color: canSupport ? Colors.white : Colors.grey.shade500),
                    label: Text(
                      canSupport
                          ? 'Support (${_complaintData!['supportCount'] ?? 0})'
                          : (isOwner ? 'Your Issue' : 'Cannot Support'),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: canSupport ? AppConstants.primaryColor : Colors.grey.shade300,
                      foregroundColor: canSupport ? Colors.white : Colors.grey.shade500,
                      disabledBackgroundColor: Colors.grey.shade300,
                      disabledForegroundColor: Colors.grey.shade500,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  );
                }(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionCard({required String title, required IconData icon, required Widget content}) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppConstants.primaryColor, size: 20),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          const Divider(height: 24),
          content,
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
