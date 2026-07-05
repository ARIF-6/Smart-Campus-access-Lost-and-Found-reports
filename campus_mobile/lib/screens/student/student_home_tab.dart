import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../models/found_item.dart';
import 'found_items_screen.dart';
import 'claim_request_screen.dart';
import 'notifications_screen.dart';
import 'lost_items_screen.dart';
import 'claims_screen.dart';
import 'student_main_screen.dart';
import 'campus_issues_home_screen.dart';
import 'class_issues_home_screen.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import 'dart:ui';

// ─────────────────────────────────────────────────────────────────────
//  Color tokens (banking-app palette)
// ─────────────────────────────────────────────────────────────────────
const _navy = Color(0xFF1B3A6B);
const _blue = Color(0xFF2563EB);
const _bg = Color(0xFFF4F7FB);
const _cardWhite = Colors.white;
const _textDark = Color(0xFF0D1B38);
const _textGrey = Color(0xFF6B7FA3);

class StudentHomeTab extends StatefulWidget {
  const StudentHomeTab({super.key});

  @override
  State<StudentHomeTab> createState() => _StudentHomeTabState();
}

class _StudentHomeTabState extends State<StudentHomeTab>
    with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  final SocketService _socketService = SocketService();
  List<FoundItem> _foundItems = [];
  bool _isLoading = true;
  String _activeFilter = 'All'; // All | Found | Lost

  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  String _searchQuery = '';
  bool _isSearchFocused = false;
  int _carouselIndex = 0;
  final CarouselSliderController _carouselController =
      CarouselSliderController();

  final List<String> _sliderImages = [
    'assets/images/2.jpeg',
    'assets/images/3.jpeg',
    'assets/images/4.jpeg',
    'assets/images/5.jpeg',
    'assets/images/6.jpeg',
    'assets/images/7.jpeg',
  ];

  final List<_Feature> _features = const [
    _Feature(Icons.search_off_rounded, 'Lost Items', 'lost'),
    _Feature(Icons.check_circle_outline_rounded, 'Found Items', 'found'),
    _Feature(Icons.eco_outlined, 'Campus', 'campus'),
    _Feature(Icons.school_outlined, 'Class', 'class'),
    _Feature(Icons.assignment_outlined, 'Claims', 'claims'),
  ];

  @override
  void initState() {
    super.initState();
    _fetchRecentFoundItems();
    _searchFocusNode.addListener(
        () => setState(() => _isSearchFocused = _searchFocusNode.hasFocus));
    _searchController.addListener(() => setState(
        () => _searchQuery = _searchController.text.trim().toLowerCase()));
    _socketService.on('foundItem:created', (_) {
      if (mounted) _fetchRecentFoundItems();
    });
    _socketService.on('lostItem:created', (_) {
      if (mounted) _fetchRecentFoundItems();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    _socketService.off('foundItem:created');
    _socketService.off('lostItem:created');
    super.dispose();
  }

  Future<void> _fetchRecentFoundItems() async {
    try {
      final response =
          await _apiService.get('/found-items?sort=-createdAt&limit=6');
      if (mounted) {
        setState(() {
          final data = response.data;
          List<dynamic> list = [];
          if (data is List) {
            list = data;
          } else if (data is Map && data.containsKey('items')) {
            list = data['items'] ?? [];
          }
          _foundItems = list
              .map((e) => FoundItem.fromJson(e as Map<String, dynamic>))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
      debugPrint('Error fetching found items: $e');
    }
  }

  // ── Filtered helpers ───────────────────────────────────────────────
  List<_Feature> get _filteredFeatures {
    if (_searchQuery.isEmpty) return [];
    return _features
        .where((f) => f.label.toLowerCase().contains(_searchQuery))
        .toList();
  }

  List<FoundItem> get _filteredItems {
    if (_searchQuery.isEmpty) return [];
    return _foundItems
        .where((item) =>
            item.title.toLowerCase().contains(_searchQuery) ||
            item.location.toLowerCase().contains(_searchQuery))
        .toList();
  }

  void _navigateFeature(String key) {
    _searchController.clear();
    _searchFocusNode.unfocus();
    switch (key) {
      case 'lost':
        _nav(const LostItemsScreen());
        break;
      case 'found':
        _nav(const FoundItemsScreen());
        break;
      case 'campus':
        _nav(const CampusIssuesHomeScreen());
        break;
      case 'class':
        _nav(const ClassIssuesHomeScreen());
        break;
      case 'claims':
        final s = context.findAncestorStateOfType<StudentMainScreenState>();
        s != null ? s.currentIndex = 1 : _nav(const ClaimsScreen());
        break;
    }
  }

  void _nav(Widget screen) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => screen));

  // ── Build ──────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final fullName = user?['fullName'] ?? 'Student';
    final studentId = user?['studentId'] ?? 'C1-000';
    final qrData = user?['qrCode'] ?? studentId;
    final photoUrl = user?['photoUrl'] != null
        ? AppConstants.getImageUrl(user!['photoUrl'])
        : '';

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: GestureDetector(
        onTap: () => _searchFocusNode.unfocus(),
        behavior: HitTestBehavior.opaque,
        child: Stack(
          children: [
            RefreshIndicator(
              onRefresh: _fetchRecentFoundItems,
              color: _navy,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // ── DYNAMIC CAROUSEL HEADER ─────────────────────────
                  SliverToBoxAdapter(
                    child:
                        _buildDynamicHeroHeader(fullName, studentId, photoUrl),
                  ),

                  // ── WHITE CONTENT SHEET ────────────────────────────
                  SliverToBoxAdapter(
                    child: Container(
                      constraints: BoxConstraints(
                        minHeight: MediaQuery.of(context).size.height * 0.62,
                      ),
                      decoration: const BoxDecoration(
                        color: _bg,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(30),
                          topRight: Radius.circular(30),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Search
                            _buildSearchBar(),
                            if (_searchQuery.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              _buildSearchResults(),
                            ],
                            if (_searchQuery.isEmpty) ...[
                              const SizedBox(height: 24),
                              // Quick Actions (banking-style 4-grid)
                              _buildQuickActions(),
                              const SizedBox(height: 24),
                              // QR ID Card (replaces banking "credit card")
                              _buildQRCard(studentId, qrData),
                              const SizedBox(height: 28),
                              // Recent Activity
                              _buildRecentHeader(),
                              const SizedBox(height: 12),
                              _buildFilterTabs(),
                              const SizedBox(height: 14),
                              _buildItemsList(),
                              const SizedBox(height: 110),
                            ],
                          ],
                        ),
                      ),
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

  // ── Dynamic Hero Header ─────────────────────────────────────────────
  Widget _buildDynamicHeroHeader(
      String fullName, String studentId, String photoUrl) {
    final double headerHeight = 310.0;

    return Stack(
      children: [
        // Carousel Slider
        CarouselSlider.builder(
          carouselController: _carouselController,
          itemCount: _sliderImages.length,
          options: CarouselOptions(
            height: headerHeight,
            viewportFraction: 1.0,
            autoPlay: true,
            autoPlayInterval: const Duration(seconds: 5),
            autoPlayAnimationDuration: const Duration(milliseconds: 800),
            autoPlayCurve: Curves.easeInOutCubic,
            enableInfiniteScroll: true,
            scrollDirection: Axis.horizontal,
            onPageChanged: (index, reason) {
              setState(() {
                _carouselIndex = index;
              });
            },
          ),
          itemBuilder: (context, index, realIndex) {
            final imagePath = _sliderImages[index];
            final isLocal = !imagePath.startsWith('http');
            return SizedBox(
              width: double.infinity,
              height: headerHeight,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  isLocal
                      ? Image.asset(imagePath, fit: BoxFit.cover)
                      : Image.network(imagePath,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Image.asset(
                              'assets/images/header_bg.jpg',
                              fit: BoxFit.cover)),
                  // Dark gradient overlay
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.black.withValues(alpha: 0.65),
                          Colors.black.withValues(alpha: 0.25),
                          const Color(0xFF0F172A).withValues(alpha: 0.95),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),

        // Foreground content on top of slider
        Container(
          height: headerHeight,
          padding: const EdgeInsets.fromLTRB(20, 52, 20, 22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // User Greeting Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Greeting & Student Info (Left side)
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Good ${_greeting()} 👋',
                          style: const TextStyle(
                            color: Colors.cyanAccent,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          fullName,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Bell & Avatar (Right side)
                  Row(
                    children: [
                      // Refresh Icon Button
                      Container(
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: IconButton(
                          icon: const Icon(
                            Icons.refresh_rounded,
                            color: Colors.white,
                            size: 22,
                          ),
                          onPressed: () {
                            _fetchRecentFoundItems();
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Data refreshed successfully!'),
                                duration: Duration(seconds: 1),
                              ),
                            );
                          },
                        ),
                      ),
                      // Bell icon
                      Consumer<NotificationProvider>(builder: (_, prov, __) {
                        return Stack(
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.12),
                                shape: BoxShape.circle,
                              ),
                              child: IconButton(
                                icon: const Icon(
                                    Icons.notifications_none_rounded,
                                    color: Colors.white,
                                    size: 22),
                                onPressed: () =>
                                    _nav(const NotificationsScreen()),
                              ),
                            ),
                            if (prov.unreadCount > 0)
                              Positioned(
                                right: 6,
                                top: 6,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                      minWidth: 16, minHeight: 16),
                                  child: Text(
                                    '${prov.unreadCount}',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 8,
                                        fontWeight: FontWeight.bold),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        );
                      }),
                      const SizedBox(width: 10),
                      // Avatar
                      GestureDetector(
                        onTap: () {
                          final s = context.findAncestorStateOfType<
                              StudentMainScreenState>();
                          if (s != null) s.currentIndex = 3;
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                                color: Colors.cyanAccent.withValues(alpha: 0.6),
                                width: 2),
                          ),
                          child: CircleAvatar(
                            radius: 20,
                            backgroundColor: Colors.white24,
                            backgroundImage: photoUrl.isNotEmpty
                                ? NetworkImage(photoUrl)
                                : null,
                            child: photoUrl.isEmpty
                                ? Text(
                                    fullName.isNotEmpty
                                        ? fullName[0].toUpperCase()
                                        : 'S',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 15),
                                  )
                                : null,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              // Bottom Section of Header: Glassmorphism ID Badge + Smooth Page Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Glassmorphic Student ID badge
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: Colors.white.withValues(alpha: 0.2),
                              width: 1.2),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Colors.cyanAccent,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'ID: $studentId',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Carousel Smooth Page Indicators
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: AnimatedSmoothIndicator(
                      activeIndex: _carouselIndex,
                      count: _sliderImages.length,
                      effect: const ExpandingDotsEffect(
                        dotHeight: 6,
                        dotWidth: 6,
                        expansionFactor: 3,
                        spacing: 5,
                        activeDotColor: Colors.cyanAccent,
                        dotColor: Colors.white24,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Search Bar ─────────────────────────────────────────────────────
  Widget _buildSearchBar() {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      decoration: BoxDecoration(
        color: _cardWhite,
        borderRadius: BorderRadius.circular(16),
        boxShadow: _isSearchFocused
            ? [
                BoxShadow(
                    color: _blue.withValues(alpha: 0.15),
                    blurRadius: 18,
                    offset: const Offset(0, 4))
              ]
            : [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 3))
              ],
        border: Border.all(
          color: _isSearchFocused
              ? _blue.withValues(alpha: 0.4)
              : Colors.transparent,
          width: 1.5,
        ),
      ),
      child: TextField(
        controller: _searchController,
        focusNode: _searchFocusNode,
        decoration: InputDecoration(
          prefixIcon: Padding(
            padding: const EdgeInsets.all(13),
            child: Icon(Icons.search_rounded,
                color: _isSearchFocused ? _blue : Colors.grey.shade400,
                size: 22),
          ),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.close_rounded,
                      color: Colors.grey.shade400, size: 20),
                  onPressed: () {
                    _searchController.clear();
                    _searchFocusNode.unfocus();
                  })
              : null,
          hintText: 'Search items, features...',
          hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }

  // ── Search Results ─────────────────────────────────────────────────
  Widget _buildSearchResults() {
    final hasFeatures = _filteredFeatures.isNotEmpty;
    final hasItems = _filteredItems.isNotEmpty;

    if (!hasFeatures && !hasItems) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 22),
        decoration: BoxDecoration(
            color: _cardWhite,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)
            ]),
        child: Center(
          child: Column(children: [
            Icon(Icons.search_off_rounded,
                color: Colors.grey.shade300, size: 34),
            const SizedBox(height: 8),
            Text('No results for "$_searchQuery"',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
          ]),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
          color: _cardWhite,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 14,
                offset: const Offset(0, 4))
          ]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (hasFeatures) ...[
          Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
              child: Text('Features',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.grey.shade500,
                      letterSpacing: 0.5))),
          ..._filteredFeatures.map((f) => ListTile(
                dense: true,
                leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                        color: _navy.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10)),
                    child: Icon(f.icon, color: _navy, size: 18)),
                title: Text(f.label,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
                trailing: const Icon(Icons.north_west_rounded,
                    size: 14, color: Colors.grey),
                onTap: () => _navigateFeature(f.key),
              )),
        ],
        if (hasItems) ...[
          if (hasFeatures) Divider(height: 1, color: Colors.grey.shade100),
          Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
              child: Text('Found Items',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.grey.shade500,
                      letterSpacing: 0.5))),
          ..._filteredItems.take(3).map((item) => ListTile(
                dense: true,
                leading: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: item.fullImageUrl.isNotEmpty
                        ? Image.network(item.fullImageUrl,
                            width: 38,
                            height: 38,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _imgPlaceholder(38))
                        : _imgPlaceholder(38)),
                title: Text(item.title,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                subtitle: Text(item.location,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                trailing: const Icon(Icons.north_west_rounded,
                    size: 14, color: Colors.grey),
                onTap: () {
                  _searchController.clear();
                  _searchFocusNode.unfocus();
                  _nav(ClaimRequestScreen(item: item));
                },
              )),
        ],
        const SizedBox(height: 8),
      ]),
    );
  }

  // ── Quick Actions (banking 4-button grid) ─────────────────────────
  Widget _buildQuickActions() {
    final actions = [
      _Action(Icons.search_off_rounded, 'Lost Items', const Color(0xFFEF4444),
          () => _nav(const LostItemsScreen())),
      _Action(Icons.check_circle_outline_rounded, 'Found Items',
          const Color(0xFF22C55E), () => _nav(const FoundItemsScreen())),
      _Action(Icons.eco_outlined, 'Campus', const Color(0xFF8B5CF6),
          () => _nav(const CampusIssuesHomeScreen())),
      _Action(Icons.assignment_outlined, 'Claims', const Color(0xFFF59E0B), () {
        final s = context.findAncestorStateOfType<StudentMainScreenState>();
        s != null ? s.currentIndex = 1 : _nav(const ClaimsScreen());
      }),
      _Action(Icons.school_outlined, 'Class Issues', const Color(0xFF3B82F6),
          () => _nav(const ClassIssuesHomeScreen())),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Quick Actions',
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.w800, color: _textDark)),
        const SizedBox(height: 14),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          child: Row(
            children: actions.map((a) {
              return Padding(
                padding: const EdgeInsets.only(right: 20),
                child: _buildActionButton(a),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton(_Action a) {
    return GestureDetector(
      onTap: a.onTap,
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: _cardWhite,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                    color: a.color.withValues(alpha: 0.12),
                    blurRadius: 14,
                    offset: const Offset(0, 6)),
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 6,
                    offset: const Offset(0, 2)),
              ],
            ),
            child: Icon(a.icon, color: a.color, size: 26),
          ),
          const SizedBox(height: 8),
          Text(a.label,
              style: const TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600, color: _textGrey),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  // ── QR / ID Card (banking "credit card" equivalent) ───────────────
  Widget _buildQRCard(String studentId, String qrData) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Your Campus ID',
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: _textDark)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                  color: const Color(0xFF22C55E).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20)),
              child: const Row(
                children: [
                  Icon(Icons.circle, color: Color(0xFF22C55E), size: 7),
                  SizedBox(width: 5),
                  Text('Active',
                      style: TextStyle(
                          color: Color(0xFF16A34A),
                          fontSize: 11,
                          fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // The "card" — dark navy gradient like banking credit card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0D1F4E), _navy, Color(0xFF1E4080)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(26),
            boxShadow: [
              BoxShadow(
                  color: _navy.withValues(alpha: 0.35),
                  blurRadius: 28,
                  offset: const Offset(0, 12)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row: chip icon + "SMART CAMPUS" label (like VISA)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.credit_card_rounded,
                        color: Colors.white70, size: 22),
                  ),
                  const Text('SMART CAMPUS',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.5)),
                ],
              ),
              const SizedBox(height: 20),

              // QR code centered
              Center(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 12,
                          offset: const Offset(0, 5)),
                    ],
                  ),
                  child: QrImageView(
                    data: qrData,
                    version: QrVersions.auto,
                    size: 120,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Card number dots (like credit card number)
              // Text(
              //   '●●●● ●●●● ●●●● ${studentId.length >= 4 ? studentId.substring(studentId.length - 4) : studentId}',
              //   style: TextStyle(
              //       color: Colors.white.withValues(alpha: 0.65),
              //       fontSize: 13,
              //       letterSpacing: 2.5,
              //       fontWeight: FontWeight.w500),
              // ),
              const SizedBox(height: 14),

              // Bottom: name + "Student Name" label
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Student name',
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.45),
                              fontSize: 9,
                              letterSpacing: 1.2,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 3),
                      Consumer<AuthProvider>(
                          builder: (_, auth, __) => Text(
                              auth.user?['fullName'] ?? 'Student',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700))),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('STUDENT ID',
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.45),
                              fontSize: 9,
                              letterSpacing: 1.2,
                              fontWeight: FontWeight.w600)),
                      const SizedBox(height: 3),
                      Text(studentId,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w700)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Recent Activity Header ─────────────────────────────────────────
  Widget _buildRecentHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('Recent Activity',
            style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.w800, color: _textDark)),
        GestureDetector(
          onTap: () => _nav(const FoundItemsScreen()),
          child: Text('See All',
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: _blue.withValues(alpha: 0.85))),
        ),
      ],
    );
  }

  // ── Filter Tabs (All | Found | Lost) ──────────────────────────────
  Widget _buildFilterTabs() {
    final tabs = ['All', 'Found', 'Lost'];
    return Row(
      children: tabs.map((t) {
        final selected = _activeFilter == t;
        return GestureDetector(
          onTap: () => setState(() => _activeFilter = t),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.only(right: 10),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? _navy : _cardWhite,
              borderRadius: BorderRadius.circular(24),
              border:
                  Border.all(color: selected ? _navy : Colors.grey.shade200),
              boxShadow: selected
                  ? [
                      BoxShadow(
                          color: _navy.withValues(alpha: 0.18),
                          blurRadius: 10,
                          offset: const Offset(0, 4))
                    ]
                  : [],
            ),
            child: Text(t,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: selected ? Colors.white : _textGrey)),
          ),
        );
      }).toList(),
    );
  }

  // ── Items List (transaction-style) ────────────────────────────────
  Widget _buildItemsList() {
    if (_isLoading) {
      return const Center(
          child: Padding(
              padding: EdgeInsets.all(28),
              child:
                  CircularProgressIndicator(color: _navy, strokeWidth: 2.5)));
    }

    final List<FoundItem> displayItems = _activeFilter == 'All'
        ? _foundItems
        : _foundItems
            .where((i) => i.status
                .toLowerCase()
                .contains(_activeFilter == 'Found' ? 'available' : 'returned'))
            .toList();

    if (displayItems.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 32),
        child: Center(
          child: Column(children: [
            Icon(Icons.inbox_rounded, color: Colors.grey.shade300, size: 44),
            const SizedBox(height: 10),
            Text('No recent activity',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 14)),
          ]),
        ),
      );
    }

    return Column(
      children: displayItems.map((item) => _buildItemRow(item)).toList(),
    );
  }

  // ── Transaction-style item row ─────────────────────────────────────
  Widget _buildItemRow(FoundItem item) {
    final isReturned = item.status == 'returned' ||
        item.status == 'claimed' ||
        item.status == 'approved';
    final isRejected = item.isRejectedByUser;
    final statusColor = isReturned ? const Color(0xFF22C55E) : _blue;
    final statusBg =
        isReturned ? const Color(0xFFDCFCE7) : const Color(0xFFEFF6FF);

    return GestureDetector(
      onTap: () {
        if (isReturned) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('This item has already been returned.'),
              backgroundColor: Colors.orange,
              behavior: SnackBarBehavior.floating));
          return;
        }
        if (isRejected) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Your claim for this item was rejected.'),
              backgroundColor: Colors.red,
              behavior: SnackBarBehavior.floating));
          return;
        }
        if (item.isClaimedByUser) return;
        _nav(ClaimRequestScreen(item: item));
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _cardWhite,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 3))
          ],
        ),
        child: Row(
          children: [
            // Image / icon
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: item.fullImageUrl.isNotEmpty
                  ? Image.network(item.fullImageUrl,
                      width: 50,
                      height: 50,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _iconBox())
                  : _iconBox(),
            ),
            const SizedBox(width: 14),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: _textDark),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 3),
                  Text(item.location,
                      style: TextStyle(fontSize: 12, color: _textGrey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            // Status badge (non-interactive, just a chip)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                  color: statusBg, borderRadius: BorderRadius.circular(12)),
              child: Text(isReturned ? 'Returned' : 'Available',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: statusColor)),
            ),
          ],
        ),
      ),
    );
  }


  Widget _imgPlaceholder(double h) => Container(
      height: h,
      width: h,
      color: const Color(0xFFF1F5F9),
      child: const Icon(Icons.image_outlined, color: Colors.grey, size: 18));

  Widget _iconBox() => Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
          color: _navy.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12)),
      child: const Icon(Icons.inventory_2_outlined, color: _navy, size: 22));

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Morning';
    if (h < 18) return 'Afternoon';
    return 'Evening';
  }
}

// ── Data classes ──────────────────────────────────────────────────────
class _Feature {
  final IconData icon;
  final String label;
  final String key;
  const _Feature(this.icon, this.label, this.key);
}

class _Action {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _Action(this.icon, this.label, this.color, this.onTap);
}
