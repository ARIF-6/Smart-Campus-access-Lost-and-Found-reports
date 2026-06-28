import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../core/widgets/widgets.dart';
import '../../services/api_service.dart';
import '../../models/lost_item.dart';
import 'package:intl/intl.dart';

class LostItemsScreen extends StatefulWidget {
  const LostItemsScreen({super.key});

  @override
  State<LostItemsScreen> createState() => _LostItemsScreenState();
}

class _LostItemsScreenState extends State<LostItemsScreen> {
  final ApiService _apiService = ApiService();
  final _searchController = TextEditingController();
  bool _isLoading = true;
  List<LostItem> _items = [];

  @override
  void initState() {
    super.initState();
    _fetchItems();
  }

  Future<void> _fetchItems({String? search}) async {
    setState(() => _isLoading = true);

    try {
      final String path = search != null && search.isNotEmpty 
          ? '/lost-items?search=$search' 
          : '/lost-items';
          
      final response = await _apiService.get(path);
      
      if (mounted) {
        setState(() {
          final data = response.data;
          List<dynamic> itemsList = [];
          if (data is List) {
            itemsList = data;
          } else if (data is Map && data.containsKey('items')) {
            itemsList = data['items'] as List<dynamic>? ?? [];
          }
          _items = itemsList.map((item) => LostItem.fromJson(item as Map<String, dynamic>)).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error fetching lost items: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Lost Items'),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppConstants.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search lost items...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _fetchItems();
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onSubmitted: (value) => _fetchItems(search: value),
            ),
          ),

          // Items List
          Expanded(
            child: _isLoading
                ? const LoadingIndicator(message: 'Loading items...')
                : _items.isEmpty
                    ? const EmptyState(
                        icon: Icons.search_off,
                        title: 'No Items Found',
                        subtitle: 'Try adjusting your search',
                      )
                    : RefreshIndicator(
                        onRefresh: () => _fetchItems(),
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _items.length,
                          itemBuilder: (context, index) {
                            final item = _items[index];
                            return _buildItemCard(item);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(LostItem item) {
    final imagePath = item.fullImageUrl;
    
    return AppCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      onTap: () {
        // Navigate to details if needed
      },
      child: Row(
        children: [
          // Item Image
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppConstants.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: imagePath.isNotEmpty
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      imagePath,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.inventory_2_outlined,
                        size: 40,
                        color: AppConstants.primaryColor,
                      ),
                    ),
                  )
                : const Icon(
                    Icons.inventory_2_outlined,
                    size: 40,
                    color: AppConstants.primaryColor,
                  ),
          ),
          const SizedBox(width: 16),

          // Item Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppConstants.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  item.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppConstants.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.access_time,
                      size: 14,
                      color: AppConstants.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      DateFormat('MMM d, yyyy').format(item.dateLost),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppConstants.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    StatusBadge(
                      label: item.status.toUpperCase(),
                      color: item.status == 'claimed'
                          ? AppConstants.successColor
                          : AppConstants.accentColor,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
