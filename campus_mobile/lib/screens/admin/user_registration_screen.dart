import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class UserRegistrationScreen extends StatefulWidget {
  const UserRegistrationScreen({super.key});

  @override
  State<UserRegistrationScreen> createState() => _UserRegistrationScreenState();
}

class _UserRegistrationScreenState extends State<UserRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController  = TextEditingController();
  final _emailController     = TextEditingController();
  final _passwordController  = TextEditingController();
  final _phoneController     = TextEditingController();
  final _addressController   = TextEditingController();
  final _studentIdController = TextEditingController();
  final _qrCodeController    = TextEditingController();
  final _photoUrlController  = TextEditingController();

  String _selectedRole = AppConstants.roleStudent;
  bool _isLoading = false;
  bool _showPassword = false;
  final ApiService _apiService = ApiService();

  final List<Map<String, String>> _roles = [
    {'label': 'Student', 'value': AppConstants.roleStudent},
    {'label': 'Security Guard', 'value': AppConstants.roleSecurity},
    {'label': 'Cleaner', 'value': AppConstants.roleCleaner},
    {'label': 'Staff', 'value': AppConstants.roleStaff},
    {'label': 'Admin', 'value': AppConstants.roleAdmin},
  ];

  @override
  void initState() {
    super.initState();
    _generatePassword();
  }

  void _generatePassword() {
    final pin = Random().nextInt(900000) + 100000;
    _passwordController.text = pin.toString();
  }

  bool get _isStudent => _selectedRole == AppConstants.roleStudent;

  Future<void> _registerUser() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final data = <String, dynamic>{
        'fullName': _fullNameController.text.trim(),
        'email': _emailController.text.trim(),
        'password': _passwordController.text.trim(),
        'role': _selectedRole,
        'phone': _phoneController.text.trim(),
        'address': _addressController.text.trim(),
      };
      if (_isStudent && _studentIdController.text.trim().isNotEmpty) {
        data['studentId'] = _studentIdController.text.trim();
      }
      if (_qrCodeController.text.trim().isNotEmpty) {
        data['qrCode'] = _qrCodeController.text.trim();
      }
      if (_photoUrlController.text.trim().isNotEmpty) {
        data['photoUrl'] = _photoUrlController.text.trim();
      }

      // Use admin create endpoint (requires admin token)
      final response = await _apiService.post('/users/create', data: data);

      if ((response.statusCode == 201 || response.statusCode == 200) && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ User registered successfully!'), backgroundColor: AppConstants.successColor),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().contains('message')
            ? e.toString() : 'Registration failed. Check all fields.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppConstants.errorColor),
        );
      }
    }
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Register New User', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // Role selector first
            const Text('Account Role', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: _selectedRole,
              decoration: InputDecoration(
                filled: true, fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                prefixIcon: const Icon(Icons.assignment_ind_outlined),
              ),
              items: _roles.map((role) => DropdownMenuItem(value: role['value'], child: Text(role['label']!))).toList(),
              onChanged: (val) => setState(() => _selectedRole = val!),
            ),
            const SizedBox(height: 20),

            // ── Student-specific fields ──────────────────────
            if (_isStudent) ...[
              _buildField('Student ID (Auto-Generated)', _studentIdController, Icons.badge_outlined,
                hint: 'System will generate ID automatically',
                enabled: false),
              const SizedBox(height: 16),
              _buildField('QR Code (Specific Text)', _qrCodeController, Icons.qr_code,
                hint: 'e.g. STU-2024-001 (leave empty to use Student ID)'),
              const SizedBox(height: 16),
              _buildField('Photo URL', _photoUrlController, Icons.image_outlined,
                hint: 'https://example.com/photo.jpg'),
              const SizedBox(height: 16),
            ],

            // ── Common fields ─────────────────────────────────
            _buildField('Full Name *', _fullNameController, Icons.person_outline,
              validator: (v) => (v == null || v.isEmpty) ? 'Required' : null),
            const SizedBox(height: 16),
            _buildField('Email Address *', _emailController, Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null),
            const SizedBox(height: 16),

            // Password row with regenerate
            Row(children: [
              Expanded(
                child: TextFormField(
                  controller: _passwordController,
                  obscureText: !_showPassword,
                  decoration: InputDecoration(
                    labelText: 'Password (6 Digits)',
                    filled: true, fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _showPassword = !_showPassword),
                    ),
                  ),
                  validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null,
                ),
              ),
              const SizedBox(width: 8),
              Tooltip(
                message: 'Regenerate password',
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.primaryColor.withValues(alpha: 0.1),
                    elevation: 0,
                    padding: const EdgeInsets.all(16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _generatePassword,
                  child: const Icon(Icons.refresh, color: AppConstants.primaryColor),
                ),
              ),
            ]),
            const SizedBox(height: 16),

            _buildField('Phone Number', _phoneController, Icons.phone_outlined, keyboardType: TextInputType.phone),
            const SizedBox(height: 16),
            _buildField('Department / Address', _addressController, Icons.location_on_outlined, maxLines: 2),
            const SizedBox(height: 32),

            // Generated credentials preview
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppConstants.primaryColor.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppConstants.primaryColor.withValues(alpha: 0.2)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Row(children: [
                  Icon(Icons.info_outline, size: 16, color: AppConstants.primaryColor),
                  SizedBox(width: 6),
                  Text('Credentials Preview', style: TextStyle(fontWeight: FontWeight.bold, color: AppConstants.primaryColor, fontSize: 13)),
                ]),
                const SizedBox(height: 8),
                Text('Password: ${_passwordController.text}', style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
                if (_isStudent && _qrCodeController.text.isNotEmpty)
                  Text('QR Code: ${_qrCodeController.text}', style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
                if (_isStudent && _studentIdController.text.isNotEmpty)
                  Text('Student ID: ${_studentIdController.text}', style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
              ]),
            ),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: _isLoading ? null : _registerUser,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConstants.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 2,
              ),
              child: _isLoading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('CREATE ACCOUNT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            const SizedBox(height: 32),
          ]),
        ),
      ),
    );
  }

  Widget _buildField(
    String label,
    TextEditingController ctrl,
    IconData icon, {
    String? hint,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    bool enabled = true,
  }) {
    return TextFormField(
      controller: ctrl,
      maxLines: maxLines,
      keyboardType: keyboardType,
      enabled: enabled,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: enabled ? Colors.white : Colors.grey.shade100,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
        disabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade200)),
        prefixIcon: Icon(icon, color: enabled ? null : Colors.grey),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      validator: validator,
    );
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _studentIdController.dispose();
    _qrCodeController.dispose();
    _photoUrlController.dispose();
    super.dispose();
  }
}
