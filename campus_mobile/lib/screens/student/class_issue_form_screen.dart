import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../models/class_issue.dart';
import '../../services/class_issue_service.dart';
import '../../core/constants.dart';
import 'package:dio/dio.dart';
import '../../core/error_handler.dart';

class ClassIssueFormScreen extends StatefulWidget {
  const ClassIssueFormScreen({super.key});

  @override
  State<ClassIssueFormScreen> createState() => _ClassIssueFormScreenState();
}

class _ClassIssueFormScreenState extends State<ClassIssueFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _classroomController = TextEditingController();
  final _buildingController = TextEditingController();
  final _service = ClassIssueService();
  final _picker = ImagePicker();

  List<ClassIssueType> _issueTypes = [];
  String? _selectedCategory;
  String? _selectedIssueTypeId;
  // Dynamic categories fetched from backend, plus "Other"
  List<String> get _categoryOptions => _issueTypes.map((e) => e.issueName).toList();

  final List<XFile> _selectedImages = [];
  bool _isLoading = false;
  bool _isFetchingData = true;

  @override
  void initState() {
    super.initState();
    _fetchInitialData();
  }

  Future<void> _fetchInitialData() async {
    try {
      final futures = await Future.wait([
        _service.getIssueTypes(),
        _service.getMyLocation(),
      ]);

      final types = futures[0] as List<ClassIssueType>;
      final location = futures[1] as Map<String, String>;

      if (mounted) {
        setState(() {
          _issueTypes = types;
          _isFetchingData = false;
          // Correctly assign fetched class and hall names
          _classroomController.text = location['className'] ?? '';
          _buildingController.text = location['hallName'] ?? '';
          // Set default selected category to first type if available
          if (types.isNotEmpty) {
            _selectedCategory = types.first.issueName;
            _selectedIssueTypeId = types.first.id;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isFetchingData = false);
      }
    }
  }

  Future<void> _pickImages() async {
    try {
      final pickedFiles = await _picker.pickMultiImage();
      if (pickedFiles.isNotEmpty) {
        setState(() {
          if (_selectedImages.length + pickedFiles.length <= 3) {
            _selectedImages.addAll(pickedFiles);
          } else {
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('You can only select up to 3 images')));
          }
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
      await _service.submitIssue(
        issueType: _selectedIssueTypeId ?? '',
        title: _selectedCategory == 'Other' ? _titleController.text.trim() : (_selectedCategory ?? ''),
        description: _descriptionController.text.trim(),
        classroom: _classroomController.text.trim(),
        building: _buildingController.text.trim(),
        images: _selectedImages,
      );

      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            title: const Text('Success!', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
            content: const Text('Your class issue has been submitted successfully.'),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context); // Pop dialog
                  Navigator.pop(context); // Pop form screen to go back
                },
                child: const Text('Got It'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        if (e is DioException && e.response?.statusCode == 409) {
          // Extract the server's message (contains issue title + current status)
          final serverMsg = (e.response?.data is Map)
              ? ((e.response?.data as Map)['message'] ?? 'This issue has already been reported.')
              : 'This issue has already been reported.';
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              title: const Text('Issue Already Active', style: TextStyle(fontWeight: FontWeight.bold)),
              content: Text(serverMsg),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Got It'),
                ),
              ],
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(ErrorHandler.getFriendlyMessage(e)),
              backgroundColor: AppConstants.errorColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
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
          SliverAppBar(
            expandedHeight: 120.0,
            floating: false,
            pinned: true,
            elevation: 0,
            backgroundColor: themeColor,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text(
                'Class Issue',
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
            child: _isFetchingData
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
                          _buildSectionTitle('Student Category'),
                          Text('What type of issue are you reporting?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.grey.shade600)),
                          _buildFormCard([
                            const SizedBox(height: 16),
                            _buildCategorySelector(themeColor),
                            if (_selectedCategory == 'Other') ...[
                              const SizedBox(height: 16),
                              _buildTitleField(themeColor),
                            ],
                          ]),

                          const SizedBox(height: 24),
                          _buildSectionTitle('Location Details'),
                          _buildFormCard([
                            Row(
                              children: [
                                Expanded(
                                  child: _buildTextField(
                                    controller: _classroomController,
                                    label: 'Assigned Class',
                                    hint: '',
                                    icon: Icons.meeting_room_rounded,
                                    themeColor: themeColor,
                                    readOnly: true,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: _buildTextField(
                                    controller: _buildingController,
                                    label: 'Assigned Hall',
                                    hint: '',
                                    icon: Icons.business_rounded,
                                    themeColor: themeColor,
                                    readOnly: true,
                                  ),
                                ),
                              ],
                            ),
                          ]),

                          const SizedBox(height: 24),
                          _buildSectionTitle('Description'),
                          _buildFormCard([
                            _buildTextField(
                              controller: _descriptionController,
                              label: 'Detailed Description',
                              hint: 'Explain the issue in detail...',
                              icon: Icons.description_rounded,
                              maxLines: 5,
                              themeColor: themeColor,
                            ),
                          ]),

                          const SizedBox(height: 24),
                          _buildSectionTitle('Evidence (Optional)'),
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

  Widget _buildCategorySelector(Color themeColor) {
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
          decoration: _inputDecoration(themeColor, 'Select Category', Icons.list_alt_rounded),
          items: [
            ..._categoryOptions.map((cat) => DropdownMenuItem(value: cat, child: Text(cat))),
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

  InputDecoration _inputDecoration(Color themeColor, String hint, IconData icon) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon, size: 20, color: themeColor),
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
    );
  }

  // Title field for 'Other' category
  Widget _buildTitleField(Color themeColor) {
    return _buildTextField(
      controller: _titleController,
      label: 'Title',
      hint: 'Enter a title',
      icon: Icons.title_rounded,
      themeColor: themeColor,
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    int maxLines = 1,
    required Color themeColor,
    bool readOnly = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          readOnly: readOnly,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
            prefixIcon: Icon(icon, size: 20, color: readOnly ? Colors.grey.shade400 : themeColor),
            filled: true,
            fillColor: readOnly ? Colors.grey.shade100 : const Color(0xFFF8FAFC),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: readOnly ? Colors.grey.shade200 : themeColor, width: 1.5)),
          ),
          validator: (v) => v == null || v.isEmpty ? 'Field required' : null,
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
                      Icon(Icons.camera_alt_rounded, color: themeColor, size: 32),
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
          'Add up to 3 photos as evidence',
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
                'Submit Report',
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
