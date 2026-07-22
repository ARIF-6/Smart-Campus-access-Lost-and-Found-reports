import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/error_handler.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../models/found_item.dart';
import 'claim_request_screen.dart';
import 'report_ownership_screen.dart';

class FoundItemsScreen extends StatefulWidget {
  const FoundItemsScreen({super.key});

  @override
  State<FoundItemsScreen> createState() => _FoundItemsScreenState();
}

class _FoundItemsScreenState extends State<FoundItemsScreen> {
  final ApiService _apiService = ApiService();
  final SocketService _socketService = SocketService();
  List<FoundItem> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchItems();
    _socketService.on('foundItem:created', (_) {
      if (mounted) _fetchItems();
    });
    _socketService.on('foundItem:updated', (_) {
      if (mounted) _fetchItems();
    });
  }

  Future<void> _fetchItems() async {
    try {
      final response = await _apiService.get('/found-items');
      if (mounted) {
        setState(() {
          final data = response.data;
          List<dynamic> itemsList = [];
          if (data is List) {
            itemsList = data;
          } else if (data is Map && data.containsKey('items')) {
            itemsList = data['items'] as List<dynamic>? ?? [];
          }
          _items = itemsList
              .map((item) => FoundItem.fromJson(item as Map<String, dynamic>))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ErrorHandler.getFriendlyMessage(e)),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _socketService.off('foundItem:created');
    _socketService.off('foundItem:updated');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Found Items')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No found items reported yet'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  itemBuilder: (context, index) {
                    final item = _items[index];
                    final currentUserId =
                        Provider.of<AuthProvider>(context, listen: false)
                            .user?['_id'];
                    final bool isOwner = item.foundBy == currentUserId;
                    final bool isUnderReview = item.status.toLowerCase() == 'under_ownership_review';
                    final bool isReturned = item.status == 'returned';
                    final bool isRejected = item.isRejectedByUser;
                    
                    final DateTime returnedTime = item.returnedAt ?? item.updatedAt ?? DateTime.now();
                    final bool canReportOwnership = item.status.toLowerCase() == 'returned' &&
                        DateTime.now().difference(returnedTime).inHours < 24;

                    // ── Tap handler ────────────────────────────────────
                    void handleTap() {
                      if (isOwner) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content:
                                Text('You are the one who submitted this item.'),
                            backgroundColor: Colors.orange,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }
                      if (isUnderReview) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('This item is currently under ownership review. No further reports are allowed.'),
                            backgroundColor: Color(0xFFF59E0B),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }
                      if (canReportOwnership) {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => ReportOwnershipScreen(item: item)),
                        ).then((value) {
                          if (value == true) {
                            _fetchItems();
                          }
                        });
                        return;
                      }
                      if (item.status.toLowerCase() == 'claimed' && !item.isClaimedByUser) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('This item has already been claimed by another student. Please wait for it to be resolved.'),
                            backgroundColor: Colors.orange,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }
                      if (isReturned) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content:
                                Text('This item has already been returned.'),
                            backgroundColor: Colors.orange,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }
                      if (isRejected) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Your claim for this item was rejected. You cannot re-claim it.'),
                            backgroundColor: Colors.red,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }
                      if (item.isClaimedByUser) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('You have already claimed this item.'),
                            backgroundColor: Colors.orange,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => ClaimRequestScreen(item: item)),
                      );
                    }

                    // ── Status badge chip ──────────────────────────────
                    Color badgeColor;
                    String badgeLabel;
                    switch (item.status) {
                      case 'available':
                        badgeColor = Colors.green;
                        badgeLabel = 'Available';
                        break;
                      case 'claimed':
                        badgeColor = Colors.orange;
                        badgeLabel = 'Claimed';
                        break;
                      case 'returned':
                        badgeColor = item.statusLabel == 'Returned to You' ? Colors.green : Colors.purple;
                        badgeLabel = item.statusLabel;
                        break;
                      case 'approved':
                        badgeColor = Colors.teal;
                        badgeLabel = 'Approved';
                        break;
                      case 'under_ownership_review':
                        badgeColor = const Color(0xFFF59E0B);
                        badgeLabel = 'Under Review';
                        break;
                      default:
                        if (isOwner) {
                          badgeColor = Colors.blue;
                          badgeLabel = 'Your Item';
                        } else {
                          badgeColor = Colors.grey;
                          badgeLabel = item.status;
                        }
                    }

                    // ── Action widget (bottom of card) ─────────────────
                    // Terminal states → non-interactive label (NO button).
                    // Only claimable state → blue ElevatedButton.
                    Widget actionWidget;
                    if (isOwner) {
                      actionWidget = _infoLabel(
                        icon: Icons.person_outline,
                        text: 'Your Item',
                        color: Colors.blue,
                      );
                    } else if (canReportOwnership) {
                      actionWidget = SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: handleTap,
                          icon: const Icon(Icons.shield_outlined, size: 16),
                          label: const Text(
                            'Report Ownership',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.purple,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                        ),
                      );
                    } else if (isUnderReview) {
                      actionWidget = _infoLabel(
                        icon: Icons.gavel_rounded,
                        text: 'Ownership Under Review',
                        color: const Color(0xFFF59E0B),
                      );
                    } else if (isReturned) {
                      final bool returnedToMe = item.statusLabel == 'Returned to You';
                      actionWidget = _infoLabel(
                        icon: Icons.check_circle_outline,
                        text: returnedToMe ? 'Returned to You' : 'Returned',
                        color: returnedToMe ? Colors.green : Colors.purple,
                      );
                    } else if (isRejected) {
                      actionWidget = _infoLabel(
                        icon: Icons.cancel_outlined,
                        text: 'Claim Rejected',
                        color: Colors.red,
                      );
                    } else if (item.isClaimedByUser) {
                      actionWidget = _infoLabel(
                        icon: Icons.hourglass_top_rounded,
                        text: 'Claim Submitted',
                        color: Colors.black87,
                      );
                    } else if (item.status.toLowerCase() == 'claimed') {
                      actionWidget = _infoLabel(
                        icon: Icons.lock_outline,
                        text: 'Claim Submitted',
                        color: Colors.orange,
                      );
                    } else {
                      actionWidget = SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: handleTap,
                          icon: const Icon(Icons.assignment_outlined, size: 16),
                          label: const Text(
                            'Claim This Item',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                        ),
                      );
                    }

                    return Card(
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: handleTap,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Item image
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  item.fullImageUrl,
                                  width: 100,
                                  height: 100,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 100,
                                    height: 100,
                                    color: Colors.grey.shade200,
                                    child: const Icon(
                                        Icons.image_not_supported_outlined,
                                        color: Colors.grey,
                                        size: 32),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Info column
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.title,
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 4),
                                    Text('📍 ${item.location}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall),
                                    const SizedBox(height: 2),
                                    Text(item.description,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodyMedium,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 8),
                                    // Status badge + date row
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: badgeColor
                                                .withValues(alpha: 0.15),
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            badgeLabel,
                                            style: TextStyle(
                                                color: badgeColor,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12),
                                          ),
                                        ),
                                        Text(
                                            DateFormat.yMMMd()
                                                .format(item.dateFound),
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall),
                                      ],
                                    ),
                                    const SizedBox(height: 10),
                                    // Action widget (button or info label)
                                    actionWidget,
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  /// Non-interactive label shown for terminal states (returned, rejected, etc.)
  Widget _infoLabel({
    required IconData icon,
    required String text,
    required Color color,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 15),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
