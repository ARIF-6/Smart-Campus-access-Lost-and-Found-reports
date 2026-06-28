import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class FoundItemsScreen extends StatefulWidget {
  const FoundItemsScreen({super.key});

  @override
  State<FoundItemsScreen> createState() => _FoundItemsScreenState();
}

class _FoundItemsScreenState extends State<FoundItemsScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _items = [];
  String _filterStatus = 'all';

  static const _themeColor = Color(0xFF0D47A1);

  final List<Map<String, dynamic>> _filters = [
    {'value': 'all', 'label': 'All'},
    {'value': 'pending', 'label': 'Pending'},
    {'value': 'stored', 'label': 'Stored'},
    {'value': 'returned', 'label': 'Returned'},
    {'value': 'claimed', 'label': 'Claimed'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _fetchItems();
    });
  }

  Future<void> _fetchItems() async {
    if (!mounted) return;
    setState(() { _loading = true; _error = null; });
    try {
      final params = <String, dynamic>{};
      if (_filterStatus != 'all') params['status'] = _filterStatus;
      final res = await _api.get('/found-items', queryParameters: params);
      if (!mounted) return;
      if (res.statusCode == 200) {
        final data = res.data;
        final List itemsList = data is List ? data : (data['items'] ?? []);
        setState(() {
          _items = itemsList.cast<Map<String, dynamic>>();
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Failed to load items. Pull to refresh.'; _loading = false; });
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending': return const Color(0xFF64748B);
      case 'stored': return const Color(0xFFF59E0B);
      case 'returned': return const Color(0xFF10B981);
      case 'claimed': return const Color(0xFF8B5CF6);
      default: return const Color(0xFF64748B);
    }
  }

  IconData _categoryIcon(String? cat) {
    switch (cat) {
      case 'electronics': return Icons.phone_android_rounded;
      case 'clothing': return Icons.checkroom_rounded;
      case 'documents': return Icons.description_rounded;
      case 'accessories': return Icons.watch_rounded;
      default: return Icons.inventory_2_rounded;
    }
  }

  String _normalizeImage(dynamic raw) {
    if (raw == null) return '';
    String image = raw.toString();
    if (image.isEmpty) return '';
    if (image.startsWith('http')) return image;
    String p = image.replaceAll('\\', '/');
    if (!p.contains('uploads/')) p = 'uploads/$p';
    if (p.startsWith('/')) p = p.substring(1);
    return '${AppConstants.serverUrl}/$p';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: _themeColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.maybePop(context),
        ),
        title: const Text('Found Items', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        centerTitle: true,
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded, color: Colors.white), onPressed: _fetchItems),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Filter Chips ───────────────────────────────────
          Container(
            color: _themeColor,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Row(
                children: _filters.map((f) {
                  final selected = _filterStatus == f['value'];
                  return Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _filterStatus = f['value'] as String);
                        _fetchItems();
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: selected ? Colors.white : Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: selected ? Colors.white : Colors.white.withValues(alpha: 0.25), width: 1),
                        ),
                        child: Text(
                          f['label'] as String,
                          style: TextStyle(
                            color: selected ? _themeColor : Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // ── Content ────────────────────────────────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: _themeColor))
                : _error != null
                    ? Center(
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Icon(Icons.wifi_off_rounded, size: 60, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text(_error!, style: TextStyle(color: Colors.grey.shade500, fontSize: 14), textAlign: TextAlign.center),
                          const SizedBox(height: 16),
                          TextButton(onPressed: _fetchItems, child: const Text('Retry', style: TextStyle(color: _themeColor))),
                        ]),
                      )
                    : _items.isEmpty
                        ? Center(
                            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                              Icon(Icons.inbox_rounded, size: 72, color: Colors.grey.shade300),
                              const SizedBox(height: 14),
                              Text('No items found', style: TextStyle(color: Colors.grey.shade400, fontSize: 16, fontWeight: FontWeight.w500)),
                              const SizedBox(height: 6),
                              Text('Items you report will appear here', style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
                            ]),
                          )
                        : RefreshIndicator(
                            onRefresh: _fetchItems,
                            color: _themeColor,
                            child: ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                              itemCount: _items.length,
                              itemBuilder: (_, i) => _buildItemCard(_items[i]),
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemCard(Map<String, dynamic> item) {
    final status = (item['status'] ?? 'pending').toString().toLowerCase();
    final title = item['title'] ?? 'Unknown Item';
    final category = item['category'] ?? 'others';
    final imageUrl = _normalizeImage(item['image'] ?? item['imageUrl']);
    final statusColor = _statusColor(status);
    final statusLabel = status[0].toUpperCase() + status.substring(1);

    return GestureDetector(
      onTap: () => _showItemDetail(item),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 14, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              child: imageUrl.isNotEmpty
                  ? Image.network(imageUrl, height: 180, width: double.infinity, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _placeholder())
                  : _placeholder(),
            ),

            // Details
            Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category icon
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: _themeColor.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(_categoryIcon(category), color: _themeColor, size: 22),
                  ),
                  const SizedBox(width: 12),

                  // Title & Category
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title,
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF1E293B)),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text(
                          category[0].toUpperCase() + category.substring(1),
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),

                  // Status badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      height: 180,
      width: double.infinity,
      color: Colors.grey.shade100,
      child: Center(child: Icon(Icons.image_outlined, size: 48, color: Colors.grey.shade300)),
    );
  }

  void _showItemDetail(Map<String, dynamic> item) {
    final status = item['status'] ?? 'pending';
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 20),
              Text(item['title'] ?? 'Unknown', style: const TextStyle(color: Color(0xFF1E293B), fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              _detailRow(Icons.category_rounded, 'Category', item['category'] ?? '-'),
              _detailRow(Icons.location_on_rounded, 'Location', item['locationFound'] ?? item['location'] ?? '-'),
              _detailRow(Icons.info_outline_rounded, 'Status', status),
              if ((item['description'] ?? '').isNotEmpty) _detailRow(Icons.description_rounded, 'Description', item['description']),
              const SizedBox(height: 20),
              if (status != 'returned')
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final id = item['_id'];
                      final nav = Navigator.of(context);
                      final messenger = ScaffoldMessenger.of(context);
                      try {
                        await _api.patch('/found-items/$id/returned');
                        nav.pop();
                        _fetchItems();
                      } catch (e) {
                        messenger.showSnackBar(const SnackBar(content: Text('Failed to update status')));
                      }
                    },
                    icon: const Icon(Icons.check_circle_outline_rounded),
                    label: const Text('Mark as Returned'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, color: _themeColor, size: 18),
          const SizedBox(width: 10),
          Text('$label: ', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
          Expanded(child: Text(value, style: const TextStyle(color: Color(0xFF1E293B), fontSize: 13, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}
