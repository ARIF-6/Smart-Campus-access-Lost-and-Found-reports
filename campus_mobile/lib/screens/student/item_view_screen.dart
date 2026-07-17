import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../models/item_model.dart';
import '../../models/found_item.dart';

class ItemViewScreen extends StatelessWidget {
  final ItemModel item;

  const ItemViewScreen({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final isLost = item.type.toLowerCase() == 'lost';
    
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Item Details', style: TextStyle(color: AppConstants.textPrimary, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppConstants.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Section
            Container(
              height: 250,
              width: double.infinity,
              color: Colors.grey.shade100,
              child: item.getImageUrl != ''
                  ? Image.network(
                      item.getImageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => 
                          const Icon(Icons.image_outlined, size: 50, color: Colors.grey),
                    )
                  : const Icon(Icons.image_outlined, size: 50, color: Colors.grey),
            ),
            
            Padding(
              padding: const EdgeInsets.all(24.0),
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
                  const SizedBox(height: 16),
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: AppConstants.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 16, color: AppConstants.textSecondary),
                      const SizedBox(width: 8),
                      Text(
                        _formatDate(item.createdAt),
                        style: const TextStyle(color: AppConstants.textSecondary, fontSize: 14),
                      ),
                    ],
                  ),
                  if ((item.status.toLowerCase() == 'returned' || item.status.toLowerCase() == 'under_ownership_review') &&
                      item.currentReturnedStudent != null) ...[
                    const SizedBox(height: 24),
                    _buildReturnedOwnerCard(item.currentReturnedStudent!),
                  ],
                  const SizedBox(height: 24),
                  const Text(
                    'Description',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppConstants.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item.description,
                    style: const TextStyle(fontSize: 15, color: AppConstants.textSecondary, height: 1.5),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Location',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppConstants.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 20, color: AppConstants.primaryColor),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          item.location,
                          style: const TextStyle(fontSize: 15, color: AppConstants.textSecondary),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Category',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppConstants.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      item.category.toUpperCase(),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppConstants.textSecondary),
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

  Widget _buildReturnedOwnerCard(ReturnedStudent student) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: Color(0xFFEFF6FF),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.handshake_outlined, size: 18, color: Color(0xFF2563EB)),
              ),
              const SizedBox(width: 8),
              const Text(
                'LATEST RETURNED OWNER',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF1E293B),
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildInfoRow('Full Name', student.fullName),
          const Divider(height: 16, color: Color(0xFFF1F5F9)),
          _buildInfoRow('Student ID', student.studentId),
          if (student.faculty != null && student.faculty!.isNotEmpty) ...[
            const Divider(height: 16, color: Color(0xFFF1F5F9)),
            _buildInfoRow('Faculty', student.faculty!),
          ],
          if (student.department != null && student.department!.isNotEmpty) ...[
            const Divider(height: 16, color: Color(0xFFF1F5F9)),
            _buildInfoRow('Department', student.department!),
          ],
          if (student.classField != null && student.classField!.isNotEmpty) ...[
            const Divider(height: 16, color: Color(0xFFF1F5F9)),
            _buildInfoRow('Class', student.classField!),
          ],
          if (student.returnedAt != null) ...[
            const Divider(height: 16, color: Color(0xFFF1F5F9)),
            _buildInfoRow('Handover Date', '${student.returnedAt!.day}/${student.returnedAt!.month}/${student.returnedAt!.year} ${student.returnedAt!.hour.toString().padLeft(2, '0')}:${student.returnedAt!.minute.toString().padLeft(2, '0')}'),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: AppConstants.textSecondary,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppConstants.textPrimary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTypeBadge(bool isLost) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: (isLost ? AppConstants.accentColor : AppConstants.successColor).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        isLost ? 'LOST' : 'FOUND',
        style: TextStyle(
          color: isLost ? AppConstants.accentColor : AppConstants.successColor,
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color = Colors.grey;
    if (status.toLowerCase() == 'approved') color = AppConstants.successColor;
    if (status.toLowerCase() == 'pending') color = AppConstants.accentColor;
    if (status.toLowerCase() == 'under_ownership_review') color = const Color(0xFFF59E0B);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
