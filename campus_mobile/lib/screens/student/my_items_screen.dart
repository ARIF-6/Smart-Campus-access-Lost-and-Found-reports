import 'package:flutter/material.dart';

import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../models/item_model.dart';
import 'student_report_item_screen.dart';
import 'item_view_screen.dart';
import 'item_edit_screen.dart';

class MyItemsScreen extends StatefulWidget {
  const MyItemsScreen({super.key});

  @override
  State<MyItemsScreen> createState() => _MyItemsScreenState();
}

class _MyItemsScreenState extends State<MyItemsScreen> {
  final ApiService _apiService = ApiService();
  final SocketService _socketService = SocketService();

  // ── Items state ─────────────────────────────────────────────────────
  List<ItemModel> _allItems = [];
  List<ItemModel> _filteredItems = [];
  bool _isLoading = true;
  String _activeFilter = 'All';

  // ── Ownership Reports state ──────────────────────────────────────────
  List<Map<String, dynamic>> _ownershipReports = [];
  bool _reportsLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchItems();
    _fetchMyOwnershipReports();
    _socketService.on('lostItem:created', (_) {
      if (mounted) _fetchItems();
    });
    _socketService.on('foundItem:created', (_) {
      if (mounted) _fetchItems();
    });
    _socketService.on('claim:updated', (_) {
      if (mounted) _fetchItems();
    });
    _socketService.on('ownershipReport:updated', (_) {
      if (mounted) _fetchMyOwnershipReports();
    });
  }

  @override
  void dispose() {
    _socketService.off('lostItem:created');
    _socketService.off('foundItem:created');
    _socketService.off('claim:updated');
    _socketService.off('ownershipReport:updated');
    super.dispose();
  }

  Future<void> _fetchItems() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiService.get('/items/my-items');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data;
        setState(() {
          _allItems = data.map((json) => ItemModel.fromJson(json)).toList();
          _applyFilter(_activeFilter == 'Reports' ? 'All' : _activeFilter);
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error fetching my items: $e');
    }
  }

  Future<void> _fetchMyOwnershipReports() async {
    setState(() => _reportsLoading = true);
    try {
      final response = await _apiService.get('/ownership-reports/my-reports');
      if (!mounted) return;
      final data = response.data;
      List<dynamic> list = [];
      if (data is List) {
        list = data;
      } else if (data is Map) {
        list = (data['data'] ?? data['reports'] ?? []) as List<dynamic>;
      }
      setState(() {
        _ownershipReports = list.cast<Map<String, dynamic>>();
        _reportsLoading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _reportsLoading = false);
      debugPrint('Error fetching ownership reports: $e');
    }
  }

  void _applyFilter(String filter) {
    setState(() {
      _activeFilter = filter;
      if (filter == 'All') {
        _filteredItems = _allItems;
      } else if (filter == 'Reports') {
        _filteredItems = [];
      } else {
        _filteredItems = _allItems.where((item) {
          return item.type.toLowerCase() == filter.toLowerCase();
        }).toList();
      }
    });
  }

  Future<void> _deleteItem(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Item'),
        content: const Text('Are you sure you want to delete this report?'),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await _apiService.delete('/items/$id');
      _fetchItems();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Item deleted successfully'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete item'), backgroundColor: Colors.red),
        );
      }
    }
  }

  // ── Refresh handler ──────────────────────────────────────────────────
  Future<void> _onRefresh() async {
    await Future.wait([_fetchItems(), _fetchMyOwnershipReports()]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('My Items',
            style: TextStyle(
                color: AppConstants.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 22)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: _onRefresh,
            icon: const Icon(Icons.refresh, color: AppConstants.textSecondary),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          _buildFilterTabs(),
          Expanded(
            child: _activeFilter == 'Reports'
                ? _buildOwnershipReportsList()
                : _isLoading
                    ? _buildSkeletonList()
                    : _filteredItems.isEmpty
                        ? _buildEmptyState()
                        : _buildItemList(),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  // ── Filter Tab Bar ───────────────────────────────────────────────────
  Widget _buildFilterTabs() {
    final filters = ['All', 'Lost', 'Found', 'Reports'];
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      color: Colors.white,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: filters.map((filter) {
          final isSelected = _activeFilter == filter;
          final isReports = filter == 'Reports';
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: InkWell(
              onTap: () => _applyFilter(filter),
              borderRadius: BorderRadius.circular(25),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isReports ? const Color(0xFF7C3AED) : AppConstants.primaryColor)
                      : Colors.white,
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(
                    color: isSelected
                        ? (isReports ? const Color(0xFF7C3AED) : AppConstants.primaryColor)
                        : Colors.grey.shade200,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isReports) ...[
                      Icon(
                        Icons.assignment_outlined,
                        size: 14,
                        color: isSelected ? Colors.white : Colors.grey.shade500,
                      ),
                      const SizedBox(width: 5),
                    ],
                    Text(
                      filter,
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppConstants.textSecondary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    // Badge count for reports
                    if (isReports && _ownershipReports.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? Colors.white.withValues(alpha: 0.3)
                              : const Color(0xFF7C3AED).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${_ownershipReports.length}',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : const Color(0xFF7C3AED),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── Items List ───────────────────────────────────────────────────────
  Widget _buildItemList() {
    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _filteredItems.length,
        itemBuilder: (context, index) {
          return _buildItemCard(_filteredItems[index]);
        },
      ),
    );
  }

  // ── Ownership Reports List ───────────────────────────────────────────
  Widget _buildOwnershipReportsList() {
    if (_reportsLoading) return _buildSkeletonList();

    if (_ownershipReports.isEmpty) {
      return RefreshIndicator(
        onRefresh: _onRefresh,
        child: ListView(
          children: [
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.5,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7C3AED).withValues(alpha: 0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.assignment_outlined,
                          size: 48, color: Color(0xFF7C3AED)),
                    ),
                    const SizedBox(height: 16),
                    const Text('No ownership reports',
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppConstants.textPrimary)),
                    const SizedBox(height: 6),
                    const Text('Ownership reports you submit will appear here',
                        style: TextStyle(
                            color: AppConstants.textSecondary, fontSize: 13),
                        textAlign: TextAlign.center),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _ownershipReports.length,
        itemBuilder: (context, index) =>
            _buildOwnershipReportCard(_ownershipReports[index]),
      ),
    );
  }

  Widget _buildOwnershipReportCard(Map<String, dynamic> report) {
    final status = (report['status'] ?? 'pending').toString().toLowerCase();
    final foundItem = report['foundItem'] as Map<String, dynamic>?;
    final itemTitle = foundItem?['title'] ?? 'Unknown Item';
    final itemLocation = foundItem?['location'] ?? '';
    final reason = report['reason'] ?? '';
    final createdAt = report['createdAt'] != null
        ? DateTime.tryParse(report['createdAt'].toString())
        : null;
    final adminComments =
        (report['adminComments'] as List<dynamic>?) ?? [];

    // Status styling
    Color statusColor;
    Color statusBg;
    IconData statusIcon;
    switch (status) {
      case 'approved':
        statusColor = AppConstants.successColor;
        statusBg = AppConstants.successColor.withValues(alpha: 0.1);
        statusIcon = Icons.check_circle_outline_rounded;
        break;
      case 'rejected':
        statusColor = AppConstants.errorColor;
        statusBg = AppConstants.errorColor.withValues(alpha: 0.1);
        statusIcon = Icons.cancel_outlined;
        break;
      default:
        statusColor = const Color(0xFFF59E0B);
        statusBg = const Color(0xFFF59E0B).withValues(alpha: 0.1);
        statusIcon = Icons.hourglass_empty_rounded;
    }

    // Image URL
    String imageUrl = '';
    if (foundItem != null) {
      final raw = foundItem['imageUrl'] ?? foundItem['image'] ?? '';
      if (raw.toString().isNotEmpty) {
        imageUrl = AppConstants.getImageUrl(raw.toString());
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: status == 'approved'
              ? AppConstants.successColor.withValues(alpha: 0.25)
              : status == 'rejected'
                  ? AppConstants.errorColor.withValues(alpha: 0.25)
                  : Colors.grey.shade100,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header row ──────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Item image / icon
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: imageUrl.isNotEmpty
                      ? Image.network(imageUrl,
                          width: 72,
                          height: 72,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _imgPlaceholder())
                      : _imgPlaceholder(),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              itemTitle,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppConstants.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Status badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 9, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusBg,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(statusIcon,
                                    size: 11, color: statusColor),
                                const SizedBox(width: 3),
                                Text(
                                  status.toUpperCase(),
                                  style: TextStyle(
                                    color: statusColor,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (itemLocation.isNotEmpty) ...[
                        const SizedBox(height: 5),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined,
                                size: 13,
                                color: AppConstants.textSecondary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                itemLocation,
                                style: const TextStyle(
                                    fontSize: 12,
                                    color: AppConstants.textSecondary),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (createdAt != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined,
                                size: 12,
                                color: AppConstants.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                              style: const TextStyle(
                                  fontSize: 11,
                                  color: AppConstants.textSecondary),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Reason ─────────────────────────────────────────────────
          if (reason.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color:
                          const Color(0xFF7C3AED).withValues(alpha: 0.12)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Your Reason',
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF7C3AED),
                            letterSpacing: 0.5)),
                    const SizedBox(height: 4),
                    Text(
                      reason,
                      style: const TextStyle(
                          fontSize: 13,
                          color: AppConstants.textPrimary,
                          height: 1.4),
                    ),
                  ],
                ),
              ),
            ),

          // ── Admin comments (if any) ─────────────────────────────────
          if (adminComments.isNotEmpty) ...[
            const Divider(height: 1, indent: 16, endIndent: 16),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.admin_panel_settings_outlined,
                          size: 14, color: AppConstants.textSecondary),
                      const SizedBox(width: 5),
                      const Text(
                        'Admin Response',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppConstants.textSecondary,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...adminComments.map((c) {
                    final comment = c is Map ? c['comment'] ?? '' : '';
                    final user = c is Map ? c['user'] : null;
                    final by = user is Map
                        ? (user['fullName'] ?? 'Admin')
                        : 'Admin';
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 28,
                            height: 28,
                            decoration: BoxDecoration(
                              color: const Color(0xFF1B3A6B)
                                  .withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                                Icons.person_outline_rounded,
                                size: 16,
                                color: Color(0xFF1B3A6B)),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(by,
                                    style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: AppConstants.textPrimary)),
                                const SizedBox(height: 2),
                                Text(comment.toString(),
                                    style: const TextStyle(
                                        fontSize: 12,
                                        color: AppConstants.textSecondary,
                                        height: 1.4)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ] else if (status == 'pending') ...[
            const Divider(height: 1, indent: 16, endIndent: 16),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              child: Row(
                children: [
                  Icon(Icons.info_outline_rounded,
                      size: 14, color: Colors.grey.shade400),
                  const SizedBox(width: 6),
                  Text(
                    'Awaiting admin review',
                    style: TextStyle(
                        fontSize: 12, color: Colors.grey.shade400),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _imgPlaceholder() => Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.inventory_2_outlined,
            color: Colors.grey, size: 28),
      );

  // ── Item card (existing) ─────────────────────────────────────────────
  Widget _buildItemCard(ItemModel item) {
    final isLost = item.type.toLowerCase() == 'lost';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => ItemViewScreen(item: item))),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: item.getImageUrl != ''
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              item.getImageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  const Icon(Icons.image_outlined,
                                      color: Colors.grey),
                            ),
                          )
                        : const Icon(Icons.image_outlined,
                            size: 30, color: Colors.grey),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildTypeBadge(isLost),
                            _buildStatusBadge(item.status),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          item.title,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: AppConstants.textPrimary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined,
                                size: 14, color: AppConstants.textSecondary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                item.location,
                                style: const TextStyle(
                                    color: AppConstants.textSecondary,
                                    fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined,
                                size: 14, color: AppConstants.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              '${item.createdAt.day}/${item.createdAt.month}/${item.createdAt.year}',
                              style: const TextStyle(
                                  color: AppConstants.textSecondary,
                                  fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1, indent: 16, endIndent: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                _buildActionButton(Icons.visibility_outlined, 'View', () {
                  Navigator.push(context,
                      MaterialPageRoute(builder: (_) => ItemViewScreen(item: item)));
                }),
                _buildActionButton(Icons.edit_outlined, 'Edit', () async {
                  final result = await Navigator.push(context,
                      MaterialPageRoute(builder: (_) => ItemEditScreen(item: item)));
                  if (result == true) _fetchItems();
                }),
                _buildActionButton(
                    Icons.delete_outline, 'Delete', () => _deleteItem(item.id),
                    isDestructive: true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypeBadge(bool isLost) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: (isLost ? AppConstants.accentColor : AppConstants.successColor)
            .withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        isLost ? 'LOST' : 'FOUND',
        style: TextStyle(
          color: isLost ? AppConstants.accentColor : AppConstants.successColor,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color = Colors.grey;
    if (status.toLowerCase() == 'approved') color = AppConstants.successColor;
    if (status.toLowerCase() == 'pending') color = AppConstants.accentColor;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.toUpperCase(),
        style:
            TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, String label, VoidCallback onTap,
      {bool isDestructive = false}) {
    return TextButton.icon(
      onPressed: onTap,
      icon: Icon(icon,
          size: 18,
          color: isDestructive ? Colors.red.shade400 : AppConstants.textSecondary),
      label: Text(label,
          style: TextStyle(
              fontSize: 12,
              color: isDestructive
                  ? Colors.red.shade400
                  : AppConstants.textSecondary)),
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('📦', style: TextStyle(fontSize: 80)),
          const SizedBox(height: 16),
          const Text('No items yet',
              style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppConstants.textPrimary)),
          const SizedBox(height: 8),
          const Text('Items you report will appear here',
              style:
                  TextStyle(color: AppConstants.textSecondary, fontSize: 14)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const StudentReportItemScreen()),
              ).then((_) => _fetchItems());
            },
            icon: const Icon(Icons.add),
            label: const Text('Report New Item'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryColor,
              foregroundColor: Colors.white,
              padding:
                  const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSkeletonList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (context, index) => Container(
        height: 160,
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
    );
  }
}
