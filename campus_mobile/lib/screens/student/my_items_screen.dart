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
  List<ItemModel> _allItems = [];
  List<ItemModel> _filteredItems = [];
  bool _isLoading = true;
  String _activeFilter = 'All';

  @override
  void initState() {
    super.initState();
    _fetchItems();
    _socketService.on('lostItem:created', (_) {
      if (mounted) _fetchItems();
    });
    _socketService.on('foundItem:created', (_) {
      if (mounted) _fetchItems();
    });
    _socketService.on('claim:updated', (_) {
      if (mounted) _fetchItems();
    });
  }

  @override
  void dispose() {
    _socketService.off('lostItem:created');
    _socketService.off('foundItem:created');
    _socketService.off('claim:updated');
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
          _applyFilter(_activeFilter);
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error fetching my items: $e');
    }
  }

  void _applyFilter(String filter) {
    setState(() {
      _activeFilter = filter;
      if (filter == 'All') {
        _filteredItems = _allItems;
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
            child: const Text('Delete', style: TextStyle(color: Colors.red))
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('My Items', 
          style: TextStyle(color: AppConstants.textPrimary, fontWeight: FontWeight.bold, fontSize: 22)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            onPressed: _fetchItems,
            icon: const Icon(Icons.refresh, color: AppConstants.textSecondary),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          _buildFilterTabs(),
          Expanded(
            child: _isLoading ? _buildSkeletonList() : 
                    _filteredItems.isEmpty ? _buildEmptyState() : _buildItemList(),
          ),
          const SizedBox(height: 80), // Padding for docked FAB
        ],
      ),
    );
  }

  Widget _buildFilterTabs() {
    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      color: Colors.white,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: ['All', 'Lost', 'Found'].map((filter) {
          final isSelected = _activeFilter == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: InkWell(
              onTap: () => _applyFilter(filter),
              borderRadius: BorderRadius.circular(25),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppConstants.primaryColor : Colors.white,
                  borderRadius: BorderRadius.circular(25),
                  border: Border.all(color: isSelected ? AppConstants.primaryColor : Colors.grey.shade200),
                ),
                child: Text(
                  filter,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppConstants.textSecondary,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildItemList() {
    return RefreshIndicator(
      onRefresh: _fetchItems,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _filteredItems.length,
        itemBuilder: (context, index) {
          return _buildItemCard(_filteredItems[index]);
        },
      ),
    );
  }

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
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ItemViewScreen(item: item))),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image
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
                                  const Icon(Icons.image_outlined, color: Colors.grey),
                            ),
                          )
                        : const Icon(Icons.image_outlined, size: 30, color: Colors.grey),
                  ),
                  const SizedBox(width: 16),
                  // Details
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
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppConstants.textPrimary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 14, color: AppConstants.textSecondary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                item.location,
                                style: const TextStyle(color: AppConstants.textSecondary, fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today_outlined, size: 14, color: AppConstants.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              '${item.createdAt.day}/${item.createdAt.month}/${item.createdAt.year}',
                              style: const TextStyle(color: AppConstants.textSecondary, fontSize: 12),
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
                   Navigator.push(context, MaterialPageRoute(builder: (_) => ItemViewScreen(item: item)));
                }),
                _buildActionButton(Icons.edit_outlined, 'Edit', () async {
                   final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => ItemEditScreen(item: item)));
                   if (result == true) _fetchItems();
                }),
                _buildActionButton(Icons.delete_outline, 'Delete', () => _deleteItem(item.id), isDestructive: true),
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
        color: (isLost ? AppConstants.accentColor : AppConstants.successColor).withValues(alpha: 0.1),
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
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, String label, VoidCallback onTap, {bool isDestructive = false}) {
    return TextButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 18, color: isDestructive ? Colors.red.shade400 : AppConstants.textSecondary),
      label: Text(label, style: TextStyle(
        fontSize: 12, 
        color: isDestructive ? Colors.red.shade400 : AppConstants.textSecondary
      )),
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
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppConstants.textPrimary)),
          const SizedBox(height: 8),
          const Text('Items you report will appear here', 
            style: TextStyle(color: AppConstants.textSecondary, fontSize: 14)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
               Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const StudentReportItemScreen()),
              ).then((_) => _fetchItems());
            },
            icon: const Icon(Icons.add),
            label: const Text('Report New Item'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
