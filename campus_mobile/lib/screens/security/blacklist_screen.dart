import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:dio/dio.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';
import '../../providers/auth_provider.dart';

import '../../providers/shift_provider.dart';
import '../../services/socket_service.dart';

class BlacklistScreen extends StatefulWidget {
  const BlacklistScreen({super.key});
  @override
  State<BlacklistScreen> createState() => _BlacklistScreenState();
}

class _BlacklistScreenState extends State<BlacklistScreen> {
  final ApiService _api = ApiService();
  List<dynamic> _list = [];
  bool _loading = true;

  final SocketService _socketService = SocketService();

  @override
  void initState() {
    super.initState();
    _fetch();
    _socketService.on('dashboard:refresh', (_) {
      if (mounted) _fetch();
    });
  }

  @override
  void dispose() {
    _socketService.off('dashboard:refresh');
    super.dispose();
  }

  Future<void> _fetch() async {
    if (mounted) setState(() => _loading = true);
    try {
      final res = await _api.get('/security/blacklist');
      if (mounted) setState(() { _list = res.data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _remove(String id) async {
    try {
      await _api.delete('/security/blacklist/$id');
      _fetch();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Removed from blacklist'), backgroundColor: Colors.green));
      }
    } catch (_) {}
  }

  void _showAddDialog() {
    final shiftProv = Provider.of<ShiftProvider>(context, listen: false);
    if (!shiftProv.hasActiveShift) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Operation blocked: You must start your shift first.'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final identifierCtrl = TextEditingController();
    final reasonCtrl = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Container(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, top: 24, left: 20, right: 20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
                  child: Icon(Icons.block, color: Colors.red.shade700, size: 28),
                ),
                const SizedBox(width: 12),
                const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Add to Blacklist', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  Text('Flag a student to restrict campus access', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ])),
              ]),
              const SizedBox(height: 20),
              _buildField('Full Name or Student ID *', identifierCtrl),
              const SizedBox(height: 12),
              _buildField('Reason *', reasonCtrl),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade800,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: isSubmitting ? null : () async {
                    final inputVal = identifierCtrl.text.trim();
                    final reasonVal = reasonCtrl.text.trim();

                    if (inputVal.isEmpty || reasonVal.isEmpty) {
                      ScaffoldMessenger.of(ctx).showSnackBar(
                        const SnackBar(content: Text('Please enter name/ID and reason'), backgroundColor: Colors.orange));
                      return;
                    }

                    // Check if input is Student ID (e.g. C113028 or starts with digit)
                    final isStudentId = RegExp(r'^[Cc]\d+$').hasMatch(inputVal) || RegExp(r'^\d+$').hasMatch(inputVal);
                    final nameVal = isStudentId ? '' : inputVal;
                    final idVal = isStudentId ? inputVal : '';

                    setModal(() => isSubmitting = true);
                    try {
                      await _api.post('/security/blacklist', data: {
                        'name': nameVal,
                        'studentId': idVal,
                        'reason': reasonVal,
                      });
                      
                      // Success
                      if (ctx.mounted) {
                        Navigator.pop(ctx); // Close dialog
                      }
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Successfully submitted blacklist request to Admin'), backgroundColor: Colors.green));
                      }
                      _fetch();
                    } catch (e) {
                      setModal(() => isSubmitting = false);
                      String errMsg = 'Error submitting blacklist request';
                      if (e is DioException && e.response?.data != null) {
                        final data = e.response!.data;
                        if (data is Map && data['message'] != null) {
                          errMsg = data['message'].toString();
                        }
                      }
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(content: Text(errMsg), backgroundColor: Colors.red));
                      }
                    }
                  },
                  child: isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('SUBMIT REQUEST', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 16),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, {int maxLines = 1}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl,
        maxLines: maxLines,
        decoration: InputDecoration(
          filled: true, fillColor: Colors.grey.shade50,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final isSecurity = auth.role == 'security' || auth.user?['role'] == 'security';

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Blacklist / Watch List'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddDialog,
        backgroundColor: Colors.red.shade800,
        icon: const Icon(Icons.block, color: Colors.white),
        label: const Text('Add Entry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _list.isEmpty
               ? Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.verified_user, size: 64, color: Colors.green.shade200),
                    const SizedBox(height: 12),
                    const Text('Blacklist is empty', style: TextStyle(color: Colors.grey, fontSize: 16)),
                    const Text('Campus is safe!', style: TextStyle(color: Colors.grey)),
                  ]),
                )
              : RefreshIndicator(
                  onRefresh: _fetch,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _list.length,
                    itemBuilder: (_, i) {
                      final entry = _list[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: Colors.red.withValues(alpha: 0.3)),
                        ),
                        elevation: 0,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Container(
                                width: 46, height: 46,
                                decoration: BoxDecoration(
                                  color: Colors.red.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(Icons.person_off, color: Colors.red),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(entry['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                                if ((entry['studentId'] ?? '').isNotEmpty)
                                  Text('ID: ${entry['studentId']}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              ])),
                            ]),
                            const SizedBox(height: 10),
                            Text('Reason: ${entry['reason'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            if ((entry['description'] ?? '').isNotEmpty)
                              Text(entry['description'], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            const SizedBox(height: 8),
                            Row(children: [
                              Icon(Icons.calendar_today, size: 12, color: Colors.grey.shade400),
                              const SizedBox(width: 4),
                              Text(
                                DateFormat('MM/dd/yyyy').format(DateTime.parse(entry['createdAt'])),
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                              if (!isSecurity) ...[
                                const Spacer(),
                                TextButton.icon(
                                  onPressed: () => showDialog(
                                    context: context,
                                    builder: (_) => AlertDialog(
                                      title: const Text('Remove from Blacklist?'),
                                      content: Text('Remove ${entry['name']} from the watch list?'),
                                      actions: [
                                        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                                        ElevatedButton(
                                          onPressed: () { Navigator.pop(context); _remove(entry['_id']); },
                                          child: const Text('Remove'),
                                        ),
                                      ],
                                    ),
                                  ),
                                  icon: const Icon(Icons.remove_circle_outline, size: 16),
                                  label: const Text('Remove', style: TextStyle(fontSize: 12)),
                                  style: TextButton.styleFrom(foregroundColor: Colors.green),
                                ),
                              ]
                            ]),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
