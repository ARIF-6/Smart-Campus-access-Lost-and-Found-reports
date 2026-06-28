import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../models/campus_complaint.dart';
import '../../services/campus_environment_service.dart';
import '../../core/constants.dart';

class CampusComplaintScreen extends StatefulWidget {
  const CampusComplaintScreen({super.key});

  @override
  State<CampusComplaintScreen> createState() => _CampusComplaintScreenState();
}

class _CampusComplaintScreenState extends State<CampusComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  final _service = CampusEnvironmentService();
  final _picker = ImagePicker();

  String? _selectedIssueTypeId;
  String? _selectedCategory;
  List<IssueType> _issueTypes = [];
  final List<XFile> _selectedImages = [];
  bool _isLoading = false;
  bool _isFetchingTypes = true;

  @override
  void initState() {
    super.initState();
    _fetchIssueTypes();
  }

  Future<void> _fetchIssueTypes() async {
    try {
      final types = await _service.getIssueTypes();
      if (mounted) {
        setState(() {
          _issueTypes = types;
          _isFetchingTypes = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isFetchingTypes = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load categories: $e'),
            backgroundColor: AppConstants.errorColor,
          ),
        );
      }
    }
  }

  Future<void> _pickImages() async {
    try {
      final pickedFiles = await _picker.pickMultiImage();
      if (pickedFiles.isNotEmpty) {
        setState(() {
          _selectedImages.addAll(pickedFiles);
        });
      }
    } catch (e) {
      debugPrint('Error picking images: $e');
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);

    try {
      await _service.submitComplaint(
        issueType: _selectedIssueTypeId ?? '',
        title: (_selectedCategory == 'Other') ? _titleController.text.trim() : (_selectedCategory ?? ''),
        description: _descriptionController.text.trim(),
        images: _selectedImages,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle_outline, color: Colors.white),
                SizedBox(width: 12),
                Text('Complaint submitted successfully!'),
              ],
            ),
            backgroundColor: AppConstants.successColor,
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        String errorMessage = 'Error reporting issue. Please try again.';
        if (e is Exception) {
          final msg = e.toString();
          errorMessage = msg.startsWith('Exception: ') ? msg.substring('Exception: '.length) : msg;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: AppConstants.errorColor,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = const Color(0xFF4C3BCF);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: CustomScrollView(
        slivers: [
          // AppBar
          SliverAppBar(
            expandedHeight: 120.0,
            floating: false,
            pinned: true,
            elevation: 0,
            backgroundColor: themeColor,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text(
                'Campus Complaint',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 18,
                  color: Colors.white,
                ),
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [themeColor, themeColor.withValues(alpha: 0.8)],
                  ),
                ),
              ),
            ),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
              onPressed: () => Navigator.pop(context),
            ),
          ),

          SliverToBoxAdapter(
            child: _isFetchingTypes
                ? const SizedBox(
                    height: 400,
                    child: Center(child: CircularProgressIndicator()),
                  )
                : Padding(
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionTitle('Issue Information'),
                          _buildFormCard([
                            _buildDropdownField(themeColor),
                            const SizedBox(height: 16),
                            if (_selectedCategory == 'Other') ...[
                              _buildTextField(
                                controller: _titleController,
                                label: 'Title',
                                hint: 'Enter a title',
                                icon: Icons.title_rounded,
                                themeColor: themeColor,
                              ),
                            ],
                          ]),

                          const SizedBox(height: 24),


                          const SizedBox(height: 24),
                          _buildSectionTitle('Description'),
                          _buildFormCard([
                            _buildTextField(
                              controller: _descriptionController,
                              label: 'Detailed Description',
                              hint: 'Describe the problem in detail...',
                              icon: Icons.description_rounded,
                              maxLines: 5,
                              themeColor: themeColor,
                            ),
                          ]),

                          const SizedBox(height: 24),
                          _buildSectionTitle('Attachments'),
                          _buildImagePickerSection(themeColor),

                          const SizedBox(height: 40),
                          _buildSubmitButton(themeColor),
                          const SizedBox(height: 40),
                        ],
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          color: Color(0xFF1E293B),
        ),
      ),
    );
  }

  Widget _buildFormCard(List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildDropdownField(Color themeColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Category',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedCategory,
          decoration: InputDecoration(
            hintText: 'Select category',
            prefixIcon: Icon(Icons.list_alt_rounded, size: 20, color: themeColor),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
          ),
          items: [
            ..._issueTypes.map((type) => DropdownMenuItem(value: type.issueName, child: Text(type.issueName))),
            const DropdownMenuItem(value: 'Other', child: Text('Other')),
          ],
          onChanged: (value) {
            setState(() {
              _selectedCategory = value;
              if (value != 'Other') {
                final match = _issueTypes.firstWhere((t) => t.issueName == value);
                _selectedIssueTypeId = match.id;
              } else {
                _selectedIssueTypeId = 'other';
              }
            });
          },
          validator: (v) => v == null ? 'Please select a category' : null,
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    int maxLines = 1,
    required Color themeColor,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
            prefixIcon: Icon(icon, size: 20, color: themeColor),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
              borderSide: BorderSide(color: themeColor, width: 1.5),
            ),
          ),
          validator: (v) => v!.isEmpty ? 'Field required' : null,
        ),
      ],
    );
  }

  Widget _buildImagePickerSection(Color themeColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 120,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              GestureDetector(
                onTap: _pickImages,
                child: Container(
                  width: 100,
                  decoration: BoxDecoration(
                    color: themeColor.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: themeColor.withValues(alpha: 0.2),
                      style: BorderStyle.solid,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.add_a_photo_rounded, color: themeColor, size: 32),
                      const SizedBox(height: 8),
                      Text(
                        'Add Photo',
                        style: TextStyle(
                          color: themeColor,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              ..._selectedImages.asMap().entries.map((entry) {
                final index = entry.key;
                final file = entry.value;
                return Container(
                  width: 100,
                  margin: const EdgeInsets.only(left: 12),
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: kIsWeb
                            ? Image.network(
                                file.path,
                                width: 100,
                                height: 120,
                                fit: BoxFit.cover,
                              )
                            : Image.file(
                                File(file.path),
                                width: 100,
                                height: 120,
                                fit: BoxFit.cover,
                              ),
                      ),
                      Positioned(
                        right: 6,
                        top: 6,
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedImages.removeAt(index)),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.close, color: Colors.white, size: 14),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Upload up to 3 clear photos of the issue',
          style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildSubmitButton(Color themeColor) {
    return Container(
      width: double.infinity,
      height: 58,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: LinearGradient(
          colors: [themeColor, themeColor.withValues(alpha: 0.8)],
        ),
        boxShadow: [
          BoxShadow(
            color: themeColor.withValues(alpha: 0.3),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : _submit,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
              )
            : const Text(
                'Submit Complaint',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
      ),
    );
  }
}
