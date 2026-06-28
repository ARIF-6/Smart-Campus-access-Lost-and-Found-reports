import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import 'student_report_item_screen.dart';

class StudentMyItemsTab extends StatefulWidget {
  const StudentMyItemsTab({super.key});

  @override
  State<StudentMyItemsTab> createState() => _StudentMyItemsTabState();
}

class _StudentMyItemsTabState extends State<StudentMyItemsTab> {
  final ApiService _apiService = ApiService();
  List<dynamic> _lostItems = [];
  List<dynamic> _foundItems = [];
  bool _isLoading = true;
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _fetchMyItems();
  }

  Future<void> _fetchMyItems() async {
    try {
      final lostResponse = await _apiService.get('/lost-items/my');
      final foundResponse = await _apiService.get('/found-items/my');

      setState(() {
        _lostItems = lostResponse.data is List ? lostResponse.data : [];
        _foundItems = foundResponse.data is List ? foundResponse.data : [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error fetching my items: $e');
    }
  }

  List<dynamic> get _displayItems {
    if (_selectedFilter == 'Lost') return _lostItems;
    if (_selectedFilter == 'Found') return _foundItems;
    return [..._lostItems, ..._foundItems]..sort((a, b) =>
        b['createdAt'].toString().compareTo(a['createdAt'].toString()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          // Blue Stats Header
          Container(
            width: double.infinity,
            padding:
                const EdgeInsets.only(top: 60, left: 24, right: 24, bottom: 24),
            color: AppConstants.primaryColor,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('My Items',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold)),
                    IconButton(
                        onPressed: _fetchMyItems,
                        icon: const Icon(Icons.refresh,
                            color: Colors.white, size: 20)),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatItem(
                        '${_lostItems.length + _foundItems.length}', 'All'),
                    _buildStatDivider(),
                    _buildStatItem('${_lostItems.length}', 'Lost'),
                    _buildStatDivider(),
                    _buildStatItem('${_foundItems.length}', 'Found'),
                  ],
                ),
              ],
            ),
          ),

          // Filter Buttons
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: ['All', 'Lost', 'Found'].map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: InkWell(
                    onTap: () => setState(() => _selectedFilter = filter),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 24, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppConstants.primaryColor
                            : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: isSelected
                                ? AppConstants.primaryColor
                                : Colors.grey.shade100),
                      ),
                      child: Text(
                        filter,
                        style: TextStyle(
                          color: isSelected ? Colors.white : Colors.grey,
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _displayItems.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _displayItems.length,
                        itemBuilder: (context, index) {
                          return _buildItemCard(_displayItems[index]);
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: _displayItems.isNotEmpty
          ? FloatingActionButton.extended(
              heroTag: 'student_report_item_fab',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const StudentReportItemScreen()),
                ).then((_) => _fetchMyItems());
              },
              label: const Text('Report Item'),
              icon: const Icon(Icons.add),
              backgroundColor: AppConstants.primaryColor,
            )
          : null,
    );
  }

  Widget _buildStatItem(String val, String label) {
    return Column(
      children: [
        Text(val,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold)),
        Text(label,
            style: const TextStyle(color: Colors.white60, fontSize: 12)),
      ],
    );
  }

  Widget _buildStatDivider() {
    return Container(height: 30, width: 1, color: Colors.white24);
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2_outlined,
              size: 80, color: Colors.grey.shade200),
          const SizedBox(height: 16),
          const Text('Nothing here yet',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Tap the button below to report\na lost or found item.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                    builder: (_) => const StudentReportItemScreen()),
              ).then((_) => _fetchMyItems());
            },
            icon: const Icon(Icons.add),
            label: const Text('Report Item'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(dynamic item) {
    final bool isLost = item['dateLost'] != null;
    final color = isLost ? Colors.red : Colors.green;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            image: (item['image'] != null && item['image'] != '') || (item['imageUrl'] != null && item['imageUrl'] != '')
                ? DecorationImage(
                    image: NetworkImage(
                        AppConstants.getImageUrl(item['imageUrl'] ?? item['image'])),
                    fit: BoxFit.cover,
                  )
                : null,
            color: Colors.grey.shade100,
          ),
          child: (item['image'] == null || item['image'] == '') && (item['imageUrl'] == null || item['imageUrl'] == '')
              ? const Icon(Icons.image_outlined, color: Colors.grey)
              : null,
        ),
        title: Text(item['title'] ?? 'Item',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(item['category'] ?? 'Category',
            style: const TextStyle(fontSize: 12)),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            isLost ? 'LOST' : 'FOUND',
            style: TextStyle(
                color: color, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ),
      ),
    );
  }
}
