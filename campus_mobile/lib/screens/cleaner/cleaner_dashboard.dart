import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import 'report_item_screen.dart';
import 'found_items_screen.dart';
import 'cleaner_profile_screen.dart';
import '../student/notifications_screen.dart';

class CleanerDashboard extends StatefulWidget {
  const CleanerDashboard({super.key});

  @override
  State<CleanerDashboard> createState() => CleanerDashboardState();
}

class CleanerDashboardState extends State<CleanerDashboard> {
  int _currentIndex = 0;
  set currentIndex(int index) => setState(() => _currentIndex = index);

  static const _themeColor = Color(0xFF1B3A6B); // banking navy

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      const _HomeTab(),
      const FoundItemsScreen(),
      const CleanerProfileScreen(),
    ];
  }

  void _onTabTapped(int index) {
    if (_currentIndex == index) return;
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      backgroundColor: AppConstants.backgroundColor,
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),

      bottomNavigationBar: Container(
        height: 76,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 22),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _buildNavItem(0, Icons.home_filled, Icons.home_outlined, 'Home'),
            _buildNavItem(1, Icons.inventory_2_rounded, Icons.inventory_2_outlined, 'Items'),
            GestureDetector(
              onTap: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const ReportItemScreen())),
              child: Container(
                width: 44,
                height: 44,
                decoration: const BoxDecoration(
                  color: Color(0xFF1F2937),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.add_rounded, color: Colors.white, size: 24),
              ),
            ),
            _buildNavItem(2, Icons.person_rounded, Icons.person_outline_rounded, 'Profile'),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(
      int index, IconData selectedIcon, IconData unselectedIcon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () => _onTabTapped(index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1F2937) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? selectedIcon : unselectedIcon,
              color: isSelected ? Colors.white : Colors.grey.shade400,
              size: 22,
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// HOME TAB
// ─────────────────────────────────────────────
class _HomeTab extends StatefulWidget {
  const _HomeTab();

  @override
  State<_HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<_HomeTab> {
  final ApiService _api = ApiService();
  bool _loading = true;
  int _totalItems = 0;
  int _storedItems = 0;
  int _returnedItems = 0;
  int _claims = 0;
  List<Map<String, dynamic>> _recentItems = [];

  static const _themeColor = Color(0xFF1B3A6B); // banking navy

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _fetchStats();
    });
  }

  Future<void> _fetchStats() async {
    if (mounted) setState(() => _loading = true);
    try {
      final res = await _api.get('/found-items');
      if (!mounted) return;
      if (res.statusCode == 200) {
        final data = res.data;
        final List itemsList = data is List ? data : (data['items'] ?? []);
        final stored = itemsList.where((i) => i['status'] == 'stored').length;
        final returned =
            itemsList.where((i) => i['status'] == 'returned').length;
        final recent =
            itemsList.take(5).map((i) => i as Map<String, dynamic>).toList();

        int claimCount = 0;
        try {
          final claimRes = await _api.get('/claims');
          if (!mounted) return;
          if (claimRes.statusCode == 200) {
            final cData = claimRes.data;
            final List claimsList =
                cData is List ? cData : (cData['items'] ?? []);
            claimCount = claimsList.length;
          }
        } catch (_) {}

        if (mounted) {
          setState(() {
            _totalItems = itemsList.length;
            _storedItems = stored;
            _returnedItems = returned;
            _claims = claimCount;
            _recentItems = recent;
            _loading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _getProfileImageUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http')) return path;
    String p = path.replaceAll('\\', '/');
    if (p.startsWith('/')) p = p.substring(1);
    return '${AppConstants.serverUrl}/$p';
  }

  // String _greeting() {
  //   final hour = DateTime.now().hour;
  //   if (hour < 12) return 'Good morning';
  //   if (hour < 17) return 'Good afternoon';
  //   return 'Good evening';
  // }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final userName =
        auth.user?['fullName']?.toString().split(' ').first ?? 'Staff';
    final photoUrl = _getProfileImageUrl(auth.user?['photoUrl']);

    return RefreshIndicator(
      onRefresh: _fetchStats,
      color: _themeColor,
      child: CustomScrollView(
        slivers: [
          // ── Navy Header ──────────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 56, 20, 26),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0xFF0D1F4E),
                    Color(0xFF1B3A6B),
                    Color(0xFF1E4080)
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(36),
                  bottomRight: Radius.circular(36),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: Colors.white24,
                        backgroundImage:
                            photoUrl.isNotEmpty ? NetworkImage(photoUrl) : null,
                        child: photoUrl.isEmpty
                            ? Text(
                                userName.isNotEmpty
                                    ? userName[0].toUpperCase()
                                    : 'C',
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16),
                              )
                            : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Text('${_greeting()} 👋',
                            //     style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11)),
                            Text(
                              userName,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      // Refresh Icon Button
                      Container(
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.14),
                          shape: BoxShape.circle,
                        ),
                        child: IconButton(
                          icon: const Icon(
                            Icons.refresh_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                          onPressed: () {
                            _fetchStats();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Data refreshed successfully!'),
                                duration: Duration(seconds: 1),
                              ),
                            );
                          },
                        ),
                      ),
                      Consumer<NotificationProvider>(
                        builder: (context, provider, child) {
                          return Stack(
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.14),
                                  shape: BoxShape.circle,
                                ),
                                child: IconButton(
                                  icon: const Icon(
                                      Icons.notifications_none_rounded,
                                      color: Colors.white,
                                      size: 24),
                                  onPressed: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                        builder: (_) =>
                                            const NotificationsScreen()),
                                  ),
                                ),
                              ),
                              if (provider.unreadCount > 0)
                                Positioned(
                                  right: 6,
                                  top: 6,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                        color: Colors.red,
                                        shape: BoxShape.circle),
                                    constraints: const BoxConstraints(
                                        minWidth: 16, minHeight: 16),
                                    child: Text('${provider.unreadCount}',
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold),
                                        textAlign: TextAlign.center),
                                  ),
                                ),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.circle,
                                color: Color(0xFF22C55E), size: 7),
                            SizedBox(width: 6),
                            Text('Cleaner Active',
                                style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // ── White Sheet Wrapper ───────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.only(top: 20),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Stat Cards (replaces Available balance / stats)
                  _loading
                      ? const Center(
                          child: CircularProgressIndicator(color: _themeColor))
                      : GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                          childAspectRatio: 1.6,
                          children: [
                            _StatCard(
                                label: 'Total Items',
                                value: _totalItems,
                                icon: Icons.inventory_2_outlined,
                                color: Colors.blue),
                            _StatCard(
                                label: 'Stored',
                                value: _storedItems,
                                icon: Icons.store_mall_directory_outlined,
                                color: Colors.amber),
                            _StatCard(
                                label: 'Returned',
                                value: _returnedItems,
                                icon: Icons.check_circle_outline_rounded,
                                color: Colors.green),
                            _StatCard(
                                label: 'Claims',
                                value: _claims,
                                icon: Icons.assignment_outlined,
                                color: Colors.purple),
                          ],
                        ),
                ],
              ),
            ),
          ),

          // Recent Items header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 28, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Recent Found Items',
                      style:
                          TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () {
                      final parentState = context
                          .findAncestorStateOfType<CleanerDashboardState>();
                      if (parentState != null) {
                        parentState
                            .setState(() => parentState._currentIndex = 1);
                      }
                    },
                    child: const Text('View All',
                        style: TextStyle(
                            color: _themeColor, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ),

          _recentItems.isEmpty
              ? SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(40),
                      child: Column(
                        children: [
                          Icon(Icons.inbox_rounded,
                              size: 60, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No recent items',
                              style: TextStyle(
                                  color: Colors.grey.shade400, fontSize: 15)),
                        ],
                      ),
                    ),
                  ),
                )
              : SliverToBoxAdapter(
                  child: SizedBox(
                    height: 170,
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      scrollDirection: Axis.horizontal,
                      itemCount: _recentItems.length,
                      itemBuilder: (context, i) =>
                          _buildHorizontalItemCard(_recentItems[i]),
                    ),
                  ),
                ),

          const SliverToBoxAdapter(child: SizedBox(height: 120)),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'stored':
        return Colors.orange;
      case 'returned':
        return AppConstants.successColor;
      case 'claimed':
        return Colors.purple;
      case 'approved':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  Widget _buildHorizontalItemCard(Map<String, dynamic> item) {
    final status = (item['status'] ?? 'pending').toString().toLowerCase();
    final String title = item['title'] ?? 'Unknown Item';
    final String category = item['category'] ?? 'General';
    String? image = item['image'] ?? item['imageUrl'];

    if (image != null && image.isNotEmpty) {
      if (!image.startsWith('http')) {
        String p = image.replaceAll('\\', '/');
        if (!p.contains('uploads/')) p = 'uploads/$p';
        if (p.startsWith('/')) p = p.substring(1);
        image = '${AppConstants.serverUrl}/$p';
      }
    } else {
      image = null;
    }

    return Container(
      width: 140,
      margin: const EdgeInsets.only(right: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: image != null
                ? Image.network(image,
                    height: 85,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _buildPlaceholder())
                : _buildPlaceholder(),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                Text(category,
                    style:
                        TextStyle(color: Colors.grey.shade500, fontSize: 10)),
                const SizedBox(height: 5),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _statusColor(status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    status[0].toUpperCase() + status.substring(1),
                    style: TextStyle(
                        color: _statusColor(status),
                        fontSize: 9,
                        fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      height: 85,
      width: double.infinity,
      color: Colors.grey.shade100,
      child: const Icon(Icons.image_outlined, color: Colors.grey),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: const Color(0xFFE8EEF6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 18),
              ),
              Text(
                '$value',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0D1B38),
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF6B7FA3),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
