import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../models/claim.dart';
import '../../core/error_handler.dart';

const _blue = Color(0xFF2563EB);
const _indigo = Color(0xFF4C3BCF);
const _bg = Color(0xFFF4F6FB);

class ClaimsScreen extends StatefulWidget {
  const ClaimsScreen({super.key});
  @override
  State<ClaimsScreen> createState() => _ClaimsScreenState();
}

class _ClaimsScreenState extends State<ClaimsScreen> {
  final ApiService _api = ApiService();
  final SocketService _socketService = SocketService();

  List<Claim> _claims = [];
  bool _loadingClaims = true;
  String _claimFilter = 'all';

  @override
  void initState() {
    super.initState();
    _loadClaims();
    _socketService.on('claim:created', (_) => _loadClaims());
    _socketService.on('claim:statusUpdated', (_) => _loadClaims());
  }

  @override
  void dispose() {
    _socketService.off('claim:created');
    _socketService.off('claim:statusUpdated');
    super.dispose();
  }

  Future<void> _loadClaims() async {
    if (mounted) setState(() => _loadingClaims = true);
    try {
      final res = await _api.get('/claims/my');
      if (res.statusCode == 200 && mounted) {
        setState(() {
          final rawData = res.data;
          if (rawData is List) {
            _claims = rawData.map((e) => Claim.fromJson(e)).toList();
          } else {
            _claims = [];
          }
          _loadingClaims = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading claims: $e');
      if (mounted) {
        setState(() => _loadingClaims = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ErrorHandler.getFriendlyMessage(e))),
        );
      }
    }
  }

  List<Claim> get _filteredClaims {
    if (_claimFilter == 'all') return _claims;
    return _claims.where((c) => c.status == _claimFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _bg,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.arrow_back_ios_new_rounded,
                      size: 16, color: Color(0xFF1E293B)),
                ),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        title: const Text(
          'My Activity',
          style: TextStyle(
              color: Color(0xFF1E293B),
              fontWeight: FontWeight.w800,
              fontSize: 20),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: _indigo),
            onPressed: _loadClaims,
          ),
        ],
      ),
      body: Column(
        children: [
          _filterRow(
            filters: const ['all', 'pending', 'approved', 'rejected'],
            labels: const ['All', 'Pending', 'Approved', 'Rejected'],
            selected: _claimFilter,
            onSelect: (v) => setState(() => _claimFilter = v),
            isBlueTheme: true,
          ),
          Expanded(
            child: _loadingClaims
                ? const Center(
                    child: CircularProgressIndicator(color: _blue))
                : _filteredClaims.isEmpty
                    ? _emptyState(
                        Icons.assignment_late_outlined,
                        'No claims yet',
                        'Items you claim will appear here',
                        action: _loadClaims,
                      )
                    : RefreshIndicator(
                        onRefresh: _loadClaims,
                        color: _blue,
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                          itemCount: _filteredClaims.length,
                          itemBuilder: (_, i) =>
                              _claimCard(_filteredClaims[i]),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  // ── MY CLAIMS CARD ─────────────────────────────────────────────
  Widget _claimCard(Claim claim) {
    final statusColor = _statusColor(claim.status);
    final imageUrl = claim.fullItemImageUrl;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 16,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Image
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: imageUrl.isNotEmpty
                      ? Image.network(imageUrl,
                          width: 72,
                          height: 72,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _imgBox(72, Icons.image_outlined))
                      : _imgBox(72, Icons.image_outlined),
                ),
                const SizedBox(width: 14),
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              claim.itemTitle,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: Color(0xFF1E293B)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _statusBadge(claim.status, statusColor),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        (claim.itemCategory ?? 'Item').toUpperCase(),
                        style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _infoChip(
                              Icons.calendar_today_rounded,
                              '${claim.createdAt.day} ${_month(claim.createdAt.month)}, ${claim.createdAt.year}'),
                          const SizedBox(width: 12),
                          _infoChip(Icons.location_on_outlined,
                              claim.itemLocation ?? 'Campus'),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Divider
          Divider(height: 1, color: Colors.grey.shade100),
          // Action Buttons
          Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                // Claimed button (disabled)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: null,
                    icon: const Icon(
                      Icons.check_circle_rounded,
                      size: 16,
                      color: Colors.grey,
                    ),
                    label: Text(
                      'Claimed',
                      style: TextStyle(
                          color: Colors.grey.shade400,
                          fontWeight: FontWeight.w600,
                          fontSize: 13),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // View Status button
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showStatusSheet(claim),
                    icon: const Icon(Icons.info_outline_rounded, size: 16),
                    label: const Text(
                      'View Status',
                      style: TextStyle(
                          fontWeight: FontWeight.w700, fontSize: 13),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showStatusSheet(Claim claim) {
    final statusColor = _statusColor(claim.status);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(28),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(2)),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(_statusIcon(claim.status),
                  color: statusColor, size: 40),
            ),
            const SizedBox(height: 16),
            Text(
              claim.status.toUpperCase(),
              style: TextStyle(
                  color: statusColor,
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                  letterSpacing: 1),
            ),
            const SizedBox(height: 8),
            Text(
              claim.itemTitle,
              style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 8),
            Text(
              _statusMessage(claim.status),
              textAlign: TextAlign.center,
              style:
                  TextStyle(color: Colors.grey.shade500, fontSize: 13),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Close',
                    style: TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  // ── SHARED WIDGETS ─────────────────────────────────────────────
  Widget _filterRow({
    required List<String> filters,
    required List<String> labels,
    required String selected,
    required ValueChanged<String> onSelect,
    bool isBlueTheme = false,
  }) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: List.generate(filters.length, (i) {
          final isSelected = selected == filters[i];

          final Color bgColor = isBlueTheme
              ? (isSelected ? _blue : _blue.withValues(alpha: 0.45))
              : (isSelected ? _blue : Colors.grey.shade50);

          final Color textColor = isBlueTheme
              ? Colors.white
              : (isSelected ? Colors.white : Colors.grey.shade600);

          return Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                left: i == 0 ? 0 : 4,
                right: i == filters.length - 1 ? 0 : 4,
              ),
              child: GestureDetector(
                onTap: () => onSelect(filters[i]),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(14),
                    border: isBlueTheme
                        ? null
                        : Border.all(
                            color: isSelected
                                ? _blue
                                : Colors.grey.shade200,
                            width: 1,
                          ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                                color: _blue.withValues(alpha: 0.25),
                                blurRadius: 10,
                                offset: const Offset(0, 4))
                          ]
                        : [],
                  ),
                  child: Center(
                    child: Text(
                      labels[i],
                      style: TextStyle(
                        color: isSelected
                            ? Colors.white
                            : (isBlueTheme
                                ? Colors.white.withValues(alpha: 0.85)
                                : textColor),
                        fontWeight: isSelected
                            ? FontWeight.w800
                            : FontWeight.w600,
                        fontSize: 11,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _statusBadge(String status, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        style: TextStyle(
            color: color,
            fontSize: 9,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.5),
      ),
    );
  }

  Widget _infoChip(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: Colors.grey.shade400),
        const SizedBox(width: 4),
        Text(text,
            style:
                TextStyle(color: Colors.grey.shade500, fontSize: 11)),
      ],
    );
  }

  Widget _imgBox(double size, IconData icon) {
    return Container(
      width: size,
      height: size,
      color: const Color(0xFFF1F5F9),
      child: Icon(icon, color: Colors.grey, size: size * 0.45),
    );
  }

  Widget _emptyState(IconData icon, String title, String sub,
      {VoidCallback? action}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: _blue.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child:
                  Icon(icon, size: 52, color: _blue.withValues(alpha: 0.5)),
            ),
            const SizedBox(height: 20),
            Text(title,
                style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E293B))),
            const SizedBox(height: 8),
            Text(sub,
                textAlign: TextAlign.center,
                style:
                    TextStyle(color: Colors.grey.shade500, fontSize: 13)),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: action ?? _loadClaims,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Refresh'),
              style: OutlinedButton.styleFrom(
                foregroundColor: _blue,
                side: BorderSide(color: _blue.withValues(alpha: 0.3)),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── HELPERS ────────────────────────────────────────────────────
  Color _statusColor(String status) {
    switch (status) {
      case 'approved':
      case 'resolved':
      case 'completed':
        return const Color(0xFF22C55E);
      case 'pending':
        return const Color(0xFFF59E0B);
      case 'rejected':
        return const Color(0xFFEF4444);
      case 'in_review':
        return _blue;
      default:
        return Colors.grey;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'approved':
        return Icons.check_circle_rounded;
      case 'pending':
        return Icons.hourglass_empty_rounded;
      case 'rejected':
        return Icons.cancel_rounded;
      default:
        return Icons.info_rounded;
    }
  }

  String _statusMessage(String status) {
    switch (status) {
      case 'approved':
        return 'Your claim has been approved.\nYou may now collect your item.';
      case 'pending':
        return 'Your claim is under review.\nWe\'ll notify you once processed.';
      case 'rejected':
        return 'Your claim was not approved.\nPlease contact campus support.';
      default:
        return 'Status update will appear here.';
    }
  }

  String _month(int m) {
    const months = [
      '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[m];
  }
}
