import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../models/found_item.dart';
import '../../core/error_handler.dart';

class ClaimRequestScreen extends StatefulWidget {
  final FoundItem item;

  const ClaimRequestScreen({super.key, required this.item});

  @override
  State<ClaimRequestScreen> createState() => _ClaimRequestScreenState();
}

class _ClaimRequestScreenState extends State<ClaimRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final ApiService _apiService = ApiService();
  final TextEditingController _messageController = TextEditingController();

  bool _isSubmitting = false;

  Future<void> _submitClaim() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      // Send simplified body as requested: { "itemId": "...", "message": "..." }
      final claimData = {
        'itemId': widget.item.id,
        'message': _messageController.text.trim(),
      };

      final response = await _apiService.post('/claims', data: claimData);

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (mounted) {
          // Show green success snackbar
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Claim submitted successfully'),
              backgroundColor: AppConstants.successColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
          
          // Clear text field as requested
          _messageController.clear();
          
          // Navigate back
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(ErrorHandler.getFriendlyMessage(e)),
            backgroundColor: AppConstants.errorColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
        debugPrint('CLAIM SUBMIT ERROR: $e');
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = widget.item.fullImageUrl;
    final currentUserId = Provider.of<AuthProvider>(context, listen: false).user?['_id'];
    final isOwner = widget.item.foundBy == currentUserId;
    
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Submit Claim', style: TextStyle(color: AppConstants.textPrimary, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: AppConstants.textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Item Preview Section
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                    child: SizedBox(
                      height: 180,
                      width: double.infinity,
                      child: imageUrl.isNotEmpty
                          ? Image.network(
                              imageUrl,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => 
                                  const Icon(Icons.image_outlined, size: 50, color: Colors.grey),
                            )
                          : const Icon(Icons.image_outlined, size: 50, color: Colors.grey),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.item.category.toUpperCase(),
                          style: const TextStyle(
                            color: AppConstants.primaryColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.item.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppConstants.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 16, color: AppConstants.primaryColor),
                            const SizedBox(width: 4),
                            Text(
                              widget.item.location,
                              style: const TextStyle(color: AppConstants.textSecondary, fontSize: 14),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Proof of Ownership',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppConstants.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Provide specific details that only the owner would know (e.g., contents of a bag, serial number, wallpaper, etc.)',
                      style: TextStyle(fontSize: 13, color: AppConstants.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    
                    // Rounded Textarea (16px)
                    TextFormField(
                      controller: _messageController,
                      maxLines: 6,
                      decoration: InputDecoration(
                        hintText: 'Describe proof of ownership...',
                        hintStyle: const TextStyle(color: Colors.grey, fontSize: 14),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppConstants.primaryColor, width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.all(16),
                      ),
                      validator: (value) => 
                          value == null || value.trim().isEmpty ? 'Please provide proof details' : null,
                    ),
                    const SizedBox(height: 32),
                    
                    // Full-width Primary Button (#2563EB)
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: (_isSubmitting || widget.item.isClaimedByUser || isOwner) ? null : _submitClaim,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: (widget.item.isClaimedByUser || isOwner) ? Colors.grey : const Color(0xFF2563EB), // #2563EB
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 2,
                          shadowColor: Colors.black.withValues(alpha: 0.3),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Text(
                                isOwner 
                                    ? 'Cannot Claim Your Own Item' 
                                    : (widget.item.isClaimedByUser ? 'Claim Already Submitted' : 'Submit Claim Request'),
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                    if (isOwner)
                      const Padding(
                        padding: EdgeInsets.only(top: 12),
                        child: Center(
                          child: Text(
                            'You are the one who submitted this item.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.orange, fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                        ),
                      )
                    else if (widget.item.isClaimedByUser)
                      const Padding(
                        padding: EdgeInsets.only(top: 12),
                        child: Center(
                          child: Text(
                            'You have already submitted a claim for this item. Please wait for the security team to review it.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.orange, fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                        ),
                      ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }
}

