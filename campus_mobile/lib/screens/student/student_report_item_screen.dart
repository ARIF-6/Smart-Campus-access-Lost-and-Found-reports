import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../../services/api_service.dart';

class StudentReportItemScreen extends StatefulWidget {
  final String? initialType;
  const StudentReportItemScreen({super.key, this.initialType});

  @override
  State<StudentReportItemScreen> createState() => _StudentReportItemScreenState();
}

class _StudentReportItemScreenState extends State<StudentReportItemScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locController = TextEditingController();

  String _reportType = 'Lost'; 
  String? _selectedCategory;
  XFile? _imageFile;
  Uint8List? _webImage;
  bool _isLoading = false;
  final ApiService _apiService = ApiService();
  final ImagePicker _picker = ImagePicker();

  List<String> _categories = [];
  bool _showCustomTitleField = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialType != null) {
      _reportType = widget.initialType!;
    }
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      final response = await _apiService.get('/categories/lost-found');
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data is List
            ? response.data
            : (response.data['data'] ?? []);
        final List<String> fetched = data.map((item) => item['name'] as String).toList();

        setState(() {
          _categories = fetched;
          // Ensure 'Other' exists in categories list
          final hasOther = _categories.any((c) => c.toLowerCase() == 'other' || c.toLowerCase() == 'others');
          if (!hasOther) {
            _categories.add('Other');
          }
          if (_categories.isNotEmpty) {
            _selectedCategory = _categories.first;
            _showCustomTitleField = _selectedCategory!.toLowerCase() == 'other' || _selectedCategory!.toLowerCase() == 'others';
          }
        });
      }
    } catch (e) {
      debugPrint('Error loading categories: $e');
    }
  }


  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    // Image is required
    if (_imageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please attach a photo of the item'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      MultipartFile? imageFile;
      if (_imageFile != null) {
        if (kIsWeb) {
          imageFile = MultipartFile.fromBytes(
            _webImage!,
            filename: _imageFile!.name,
            contentType: MediaType('image', 'jpeg'),
          );
        } else {
          imageFile = await MultipartFile.fromFile(
            _imageFile!.path,
            filename: _imageFile!.name,
            contentType: MediaType('image', 'jpeg'),
          );
        }
      }

      final isLost = _reportType == 'Lost';
      final endpoint = isLost ? '/lost-items' : '/found-items';
      
      final Map<String, dynamic> data = {
        'title': _showCustomTitleField ? _titleController.text.trim() : (_selectedCategory ?? 'Item'),
        'description': _descController.text.trim(),
        'category': _selectedCategory?.toLowerCase() ?? '',
      };

      if (isLost) {
        data['locationLost'] = _locController.text.trim();
        data['dateLost'] = DateTime.now().toIso8601String();
      } else {
        data['locationFound'] = _locController.text.trim();
        data['dateFound'] = DateTime.now().toIso8601String();
      }

      if (imageFile != null) {
        data['image'] = imageFile;
      }

      FormData formData = FormData.fromMap(data);
      await _apiService.post(endpoint, data: formData);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$_reportType item reported successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      String msg = 'An unexpected error occurred';
      if (e is DioException) {
        if (e.response?.data is Map) {
          msg = e.response?.data['message'] ?? e.message;
        } else {
          msg = e.message ?? 'Server error';
        }
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $msg'),
            backgroundColor: Colors.red,
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
    final accentColor = _reportType == 'Lost' ? const Color(0xFFEF4444) : const Color(0xFFF59E0B);

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
              title: Text(
                'Report $_reportType Item',
                style: const TextStyle(
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
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Type Selector
                    _buildSectionTitle('Type & Visuals'),
                    _buildFormCard([
                      _buildTypeToggle(accentColor),
                      const SizedBox(height: 20),
                      _buildPhotoBox(accentColor),
                    ]),

                    const SizedBox(height: 24),
                    _buildSectionTitle('Item Information'),
                    _buildFormCard([
                      _buildDropdownField(themeColor),
                      if (_showCustomTitleField) ...[
                        const SizedBox(height: 16),
                        _buildTextField(
                          controller: _titleController,
                          label: 'Item Title',
                          hint: 'e.g. Blue Backpack, iPhone 13',
                          icon: Icons.label_important_rounded,
                          themeColor: themeColor,
                        ),
                      ],
                    ]),

                    const SizedBox(height: 24),
                    _buildSectionTitle('Discovery Details'),
                    _buildFormCard([
                      _buildTextField(
                        controller: _locController,
                        label: _reportType == 'Lost' ? 'Last Seen At' : 'Found At',
                        hint: 'e.g. Library, Cafe, Block C',
                        icon: Icons.location_on_rounded,
                        themeColor: themeColor,
                      ),
                      const SizedBox(height: 16),
                      _buildTextField(
                        controller: _descController,
                        label: 'Description',
                        hint: 'Color, brand, unique marks...',
                        icon: Icons.description_rounded,
                        maxLines: 4,
                        themeColor: themeColor,
                      ),
                    ]),

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

  Widget _buildTypeToggle(Color accentColor) {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Stack(
        children: [
          AnimatedAlign(
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeInOut,
            alignment: _reportType == 'Lost' ? Alignment.centerLeft : Alignment.centerRight,
            child: Container(
              width: MediaQuery.of(context).size.width * 0.38,
              height: 42,
              margin: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(
                color: accentColor,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: accentColor.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _reportType = 'Lost'),
                  child: Center(
                    child: Text(
                      'Lost',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _reportType == 'Lost' ? Colors.white : Colors.grey.shade500,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _reportType = 'Found'),
                  child: Center(
                    child: Text(
                      'Found',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _reportType == 'Found' ? Colors.white : Colors.grey.shade500,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    final XFile? picked = await _picker.pickImage(
      source: source,
      maxWidth: 1200,
      maxHeight: 1200,
      imageQuality: 85,
    );
    if (picked != null) {
      if (kIsWeb) {
        final bytes = await picked.readAsBytes();
        setState(() {
          _imageFile = picked;
          _webImage = bytes;
        });
      } else {
        setState(() {
          _imageFile = picked;
        });
      }
    }
  }

  Widget _buildPhotoBox(Color accentColor) {
    final bool isEmpty = _imageFile == null;

    // Found Item uses the side-by-side cards layout
    if (_reportType == 'Found' && isEmpty) {
      return Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => _pickImage(ImageSource.gallery),
              child: Container(
                height: 140,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8E8E8),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFD2D2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.photo_library_rounded,
                        color: Color(0xFFE53935),
                        size: 28,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'upload photo',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: GestureDetector(
              onTap: () => _pickImage(ImageSource.camera),
              child: Container(
                height: 140,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8E8E8),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFD2D2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(
                        Icons.camera_alt_rounded,
                        color: Color(0xFFE53935),
                        size: 28,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'take photo',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF4B5563),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    // Otherwise show selected preview or the original Lost item upload container
    return Container(
      width: double.infinity,
      height: 160,
      decoration: BoxDecoration(
        color: isEmpty ? Colors.red.shade50 : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isEmpty ? Colors.red.shade300 : accentColor.withValues(alpha: 0.2),
          width: isEmpty ? 2.0 : 1.5,
        ),
      ),
      child: _imageFile != null
          ? ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  kIsWeb
                      ? Image.memory(_webImage!, fit: BoxFit.cover)
                      : Image.file(File(_imageFile!.path), fit: BoxFit.cover),
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.black.withValues(alpha: 0.1), Colors.black.withValues(alpha: 0.4)],
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _imageFile = null;
                          _webImage = null;
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                      ),
                    ),
                  ),
                  const Center(
                    child: Icon(Icons.camera_alt_rounded, color: Colors.white, size: 32),
                  ),
                ],
              ),
            )
          : GestureDetector(
              onTap: () => _pickImage(ImageSource.gallery),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.add_a_photo_rounded, color: Colors.red.shade400, size: 32),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Attach a Photo (Required)',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.red),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'A photo is mandatory to submit a report',
                    style: TextStyle(color: Colors.red.shade300, fontSize: 12),
                  ),
                ],
              ),
            ),
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
          validator: (v) => v == null || v.isEmpty ? 'This field is required' : null,
        ),
      ],
    );
  }

  Widget _buildDropdownField(Color themeColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Category',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: Colors.grey.shade600,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedCategory,
          items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: (val) {
            setState(() {
              _selectedCategory = val;
              _showCustomTitleField = val != null && (val.toLowerCase() == 'other' || val.toLowerCase() == 'others');
            });
          },
          decoration: InputDecoration(
            prefixIcon: Icon(Icons.grid_view_rounded, size: 20, color: themeColor),
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
          ),
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
            : Text(
                'Report $_reportType Item',
                style: const TextStyle(
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
