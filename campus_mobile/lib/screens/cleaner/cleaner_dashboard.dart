import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import 'report_item_screen.dart';
import 'found_items_screen.dart';
import 'cleaner_profile_screen.dart';
import '../student/notifications_screen.dart';
import '../../core/app_lifecycle_observer.dart';

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
      const FoundItemsScreen(initialStatus: 'returned'),
      const CleanerProfileScreen(),
    ];
  }

  void _onTabTapped(int index) {
    if (_currentIndex == index) return;
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return AppLifecycleObserver(
      onResume: () {
        if (!mounted) return;
        Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
      },
      child: Scaffold(
        extendBody: true,
        backgroundColor: AppConstants.backgroundColor,
        body: IndexedStack(
          index: _currentIndex,
          children: _pages,
        ),

        bottomNavigationBar: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.topCenter,
          children: [
            Container(
              height: 76,
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 22),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(child: _buildNavItem(0, Icons.home_filled, Icons.home_outlined, 'Home')),
                  Expanded(child: _buildNavItem(1, Icons.inventory_2_rounded, Icons.inventory_2_outlined, 'Items')),
                  const SizedBox(width: 60),
                  Expanded(child: _buildNavItem(2, Icons.check_circle_rounded, Icons.check_circle_outline_rounded, 'Returned')),
                  Expanded(child: _buildNavItem(3, Icons.person_rounded, Icons.person_outline_rounded, 'Profile')),
                ],
              ),
            ),
            Positioned(
              top: -24,
              child: GestureDetector(
                onTap: () => Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const ReportItemScreen())),
                child: Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF2563EB).withOpacity(0.35),
                        blurRadius: 16,
                        offset: const Offset(0, 8),
                      ),
                    ],
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                  child: const Icon(Icons.add_rounded, color: Colors.white, size: 28),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(
      int index, IconData selectedIcon, IconData unselectedIcon, String label) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? const Color(0xFF2563EB) : const Color(0xFF94A3B8);
    return GestureDetector(
      onTap: () => _onTabTapped(index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            isSelected ? selectedIcon : unselectedIcon,
            color: color,
            size: 24,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              letterSpacing: 0.2,
            ),
          ),
        ],
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
  final SocketService _socketService = SocketService();
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
    _socketService.on('foundItem:created', (_) {
      if (mounted) _fetchStats();
    });
    _socketService.on('foundItem:updated', (_) {
      if (mounted) _fetchStats();
    });
    _socketService.on('claim:updated', (_) {
      if (mounted) _fetchStats();
    });
  }

  @override
  void dispose() {
    _socketService.off('foundItem:created');
    _socketService.off('foundItem:updated');
    _socketService.off('claim:updated');
    super.dispose();
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

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final fullName = auth.user?['fullName']?.toString() ?? 'Staff';
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
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Avatar on the left (matches image design)
                      Container(
                        padding: const EdgeInsets.all(3.5),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.25),
                            width: 1.5,
                          ),
                        ),
                        child: CircleAvatar(
                          radius: 24,
                          backgroundColor: const Color(0xFF2563EB),
                          backgroundImage:
                              photoUrl.isNotEmpty ? NetworkImage(photoUrl) : null,
                          child: photoUrl.isEmpty
                              ? Text(
                                  fullName.isNotEmpty
                                      ? fullName[0].toUpperCase()
                                      : 'C',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18),
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(width: 14),
                      // Greeting + full name
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Good ${_greeting()} 👋',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.75),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.3,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              fullName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.3,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      // Notification Bell with badge
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
                                    right: 8,
                                    top: 8,
                                    child: Container(
                                      width: 10,
                                      height: 10,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFEF4444),
                                        shape: BoxShape.circle,
                                      ),
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
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.18,
                          children: [
                            _StatCard(
                                label: 'Total Items',
                                value: _totalItems,
                                icon: Icons.inventory_2_outlined,
                                color: const Color(0xFF1A73E8)),
                            _StatCard(
                                label: 'Stored',
                                value: _storedItems,
                                icon: Icons.store_mall_directory_outlined,
                                color: const Color(0xFF374151)),
                            _StatCard(
                                label: 'Returned',
                                value: _returnedItems,
                                icon: Icons.check_circle_outline_rounded,
                                color: const Color(0xFF1E8E3E)),
                            _StatCard(
                                label: 'Claims',
                                value: _claims,
                                icon: Icons.assignment_outlined,
                                color: const Color(0xFF8E24AA)),
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

class _StatCard extends StatefulWidget {
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
  State<_StatCard> createState() => _StatCardState();
}

class _StatCardState extends State<_StatCard> with SingleTickerProviderStateMixin {
  bool _isHovered = false;
  late AnimationController _pressController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _pressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 120),
      lowerBound: 0.93,
      upperBound: 1.0,
    )..value = 1.0;
    _scaleAnimation = _pressController;
  }

  @override
  void dispose() {
    _pressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTapDown: (_) => _pressController.reverse(),
        onTapUp: (_) => _pressController.forward(),
        onTapCancel: () => _pressController.forward(),
        child: AnimatedScale(
          scale: _isHovered ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          child: ScaleTransition(
            scale: _scaleAnimation,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: widget.color.withValues(alpha: 0.12),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
                border: Border.all(color: widget.color.withValues(alpha: 0.1), width: 1.5),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: Stack(
                  children: [
                    // Colored top-left corner accent
                    Positioned(
                      top: 0,
                      left: 0,
                      child: Container(
                        width: 60,
                        height: 4,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [widget.color, widget.color.withValues(alpha: 0.0)],
                          ),
                        ),
                      ),
                    ),
                    // Card content
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // Icon with glow ring
                              Container(
                                padding: const EdgeInsets.all(11),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      widget.color.withValues(alpha: 0.18),
                                      widget.color.withValues(alpha: 0.05),
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: widget.color.withValues(alpha: 0.2),
                                    width: 1,
                                  ),
                                ),
                                child: Icon(widget.icon, color: widget.color, size: 22),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${widget.value}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 24,
                                  color: Color(0xFF0F172A),
                                  letterSpacing: -1,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                widget.label,
                                style: const TextStyle(
                                  color: Color(0xFF64748B),
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.2,
                                  height: 1.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
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
          ),
        ),
      ),
    );
  }
}
