import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class StudentClaimsTab extends StatefulWidget {
  const StudentClaimsTab({super.key});

  @override
  State<StudentClaimsTab> createState() => _StudentClaimsTabState();
}

class _StudentClaimsTabState extends State<StudentClaimsTab> {
  final ApiService _apiService = ApiService();
  List<dynamic> _allClaims = [];
  List<dynamic> _filteredClaims = [];
  String _selectedFilter = 'All';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchMyClaims();
  }

  Future<void> _fetchMyClaims() async {
    try {
      setState(() => _isLoading = true);
      final response = await _apiService.get('/claims/my');
      if (response.data is List) {
        setState(() {
          _allClaims = response.data;
          _filterClaims(_selectedFilter);
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
      debugPrint('Error fetching claims: $e');
    }
  }

  void _filterClaims(String status) {
    setState(() {
      _selectedFilter = status;
      if (status == 'All') {
        _filteredClaims = _allClaims;
      } else {
        _filteredClaims = _allClaims.where((c) => c['status'].toString().toLowerCase() == status.toLowerCase()).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text(
          'My Claims',
          style: TextStyle(
            color: AppConstants.textPrimary,
            fontWeight: FontWeight.w900,
            fontSize: 24,
            letterSpacing: -0.5,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: IconButton(
              onPressed: _fetchMyClaims,
              icon: const Icon(Icons.refresh_rounded, color: AppConstants.primaryColor, size: 20),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          _buildFilterBar(),
          Expanded(
            child: _isLoading
                ? _buildSkeletonLoading()
                : _filteredClaims.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _fetchMyClaims,
                        color: AppConstants.primaryColor,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: _filteredClaims.length,
                          itemBuilder: (context, index) {
                            return _buildModernClaimCard(_filteredClaims[index]);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      height: 60,
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: ['All', 'Pending', 'Approved', 'Rejected'].map((status) {
          final isSelected = _selectedFilter == status;
          return GestureDetector(
            onTap: () => _filterClaims(status),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 24),
              decoration: BoxDecoration(
                color: isSelected ? AppConstants.primaryColor : Colors.white,
                borderRadius: BorderRadius.circular(30),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: AppConstants.primaryColor.withValues(alpha: 0.25),
                          blurRadius: 15,
                          offset: const Offset(0, 6),
                        )
                      ]
                    : [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                        )
                      ],
              ),
              child: Center(
                child: Text(
                  status,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppConstants.textSecondary,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    fontSize: 14,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildModernClaimCard(dynamic claim) {
    final status = claim['status']?.toString().toLowerCase() ?? 'pending';
    final date = claim['createdAt'] != null 
        ? DateFormat('MMM dd, yyyy').format(DateTime.parse(claim['createdAt'])) 
        : '';
    final item = claim['item'] ?? {};
    final String title = item['title'] ?? 'Unknown Item';
    final String category = item['category'] ?? 'General';
    final String location = item['location'] ?? 'Not Specified';
    
    String? imageUrl = item['image'] ?? item['imageUrl'];
    if (imageUrl != null && !imageUrl.startsWith('http')) {
      imageUrl = '${AppConstants.serverUrl}/${imageUrl.replaceAll('\\', '/')}';
    }

    Color statusColor;
    String statusText;
    
    switch (status) {
      case 'approved':
        statusColor = AppConstants.successColor;
        statusText = 'Approved';
        break;
      case 'rejected':
        statusColor = AppConstants.errorColor;
        statusText = 'Rejected';
        break;
      default:
        statusColor = AppConstants.accentColor;
        statusText = 'Pending';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 🖼️ IMAGE SECTION
              Hero(
                tag: 'claim_${claim['_id']}',
                child: Container(
                  width: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    image: imageUrl != null
                        ? DecorationImage(
                            image: NetworkImage(imageUrl),
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: imageUrl == null
                      ? Icon(Icons.broken_image_outlined, color: Colors.grey.shade300, size: 30)
                      : null,
                ),
              ),
              
              // 📝 CONTENT SECTION
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildStatusBadge(statusText, statusColor),
                          const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: Colors.grey),
                        ],
                      ),
                      const SizedBox(height: 12),
                      
                      Text(
                        title,
                        style: const TextStyle(
                          color: AppConstants.textPrimary,
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                          letterSpacing: -0.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      
                      // 🏷️ CATEGORY BADGE
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppConstants.primaryColor.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppConstants.primaryColor.withValues(alpha: 0.1)),
                        ),
                        child: Text(
                          category.toUpperCase(),
                          style: const TextStyle(
                            color: AppConstants.primaryColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                      
                      const Spacer(),
                      const SizedBox(height: 12),
                      
                      // 📍 FOOTER
                      Row(
                        children: [
                          Icon(Icons.calendar_today_rounded, size: 12, color: Colors.grey.shade400),
                          const SizedBox(width: 4),
                          Text(
                            date,
                            style: TextStyle(color: Colors.grey.shade400, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                          const Spacer(),
                          Text(
                            location,
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  Widget _buildSkeletonLoading() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        height: 100,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Container(
              width: 70, height: 70,
              margin: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12)),
            ),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(height: 12, width: 120, decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(4))),
                  const SizedBox(height: 8),
                  Container(height: 10, width: 80, decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(4))),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: const Text('📦', style: TextStyle(fontSize: 40)),
          ),
          const SizedBox(height: 20),
          const Text(
            'No claims yet',
            style: TextStyle(
              color: AppConstants.textPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Your claim requests will appear here',
            style: TextStyle(
              color: AppConstants.textSecondary,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _fetchMyClaims,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryColor,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: const Text('Refresh Feed', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
