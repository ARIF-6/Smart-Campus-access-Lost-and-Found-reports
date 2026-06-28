import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class VisitorsScreen extends StatefulWidget {
  const VisitorsScreen({super.key});
  @override
  State<VisitorsScreen> createState() => _VisitorsScreenState();
}

class _VisitorsScreenState extends State<VisitorsScreen> {
  final ApiService _api = ApiService();
  List<dynamic> _visitors = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchVisitors();
  }

  Future<void> _fetchVisitors() async {
    if (mounted) setState(() => _loading = true);
    try {
      final res = await _api.get('/security/visitors');
      if (mounted) setState(() { _visitors = res.data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markExit(String id) async {
    try {
      await _api.patch('/security/visitors/$id/exit', data: {});
      _fetchVisitors();
    } catch (_) {}
  }

  void _showRegisterDialog() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final purposeCtrl = TextEditingController();
    final hostCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
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
                decoration: BoxDecoration(color: Colors.teal.shade50, borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.person_add, color: Colors.teal.shade700, size: 28),
              ),
              const SizedBox(width: 12),
              const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Register Visitor', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Text('Log visitor entry to campus', style: TextStyle(color: Colors.grey, fontSize: 12)),
              ])),
            ]),
            const SizedBox(height: 20),
            _field('Full Name *', nameCtrl),
            const SizedBox(height: 12),
            _field('Phone Number', phoneCtrl, keyboardType: TextInputType.phone),
            const SizedBox(height: 12),
            _field('Purpose of Visit *', purposeCtrl),
            const SizedBox(height: 12),
            _field('Host / Person Being Visited', hostCtrl),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal.shade700,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () async {
                  if (nameCtrl.text.trim().isEmpty || purposeCtrl.text.trim().isEmpty) return;
                  Navigator.pop(ctx);
                  try {
                    await _api.post('/security/visitors', data: {
                      'name': nameCtrl.text.trim(),
                      'idNumber': '',
                      'phone': phoneCtrl.text.trim(),
                      'purpose': purposeCtrl.text.trim(),
                      'hostName': hostCtrl.text.trim(),
                    });
                    _fetchVisitors();
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('✅ Visitor registered'), backgroundColor: Colors.teal));
                    }
                  } catch (_) {}
                },
                child: const Text('REGISTER VISITOR',style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
              ),
            ),
            const SizedBox(height: 16),
          ]),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl, {TextInputType? keyboardType}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl,
        keyboardType: keyboardType,
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
    final inside = _visitors.where((v) => v['status'] == 'inside').toList();
    final exited = _visitors.where((v) => v['status'] == 'exited').toList();

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Visitor Register'),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showRegisterDialog,
        backgroundColor: Colors.teal.shade700,
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('Register Visitor', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchVisitors,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  // Summary
                  Row(children: [
                    _chip('Inside', inside.length.toString(), Colors.teal, Icons.meeting_room),
                    const SizedBox(width: 12),
                    _chip('Exited', exited.length.toString(), Colors.grey, Icons.exit_to_app),
                    const SizedBox(width: 12),
                    _chip('Total', _visitors.length.toString(), AppConstants.primaryColor, Icons.people),
                  ]),
                  const SizedBox(height: 20),
                  if (inside.isNotEmpty) ...[
                    const Text('Currently Inside', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 10),
                    ...inside.map((v) => _visitorCard(v, showExit: true)),
                    const SizedBox(height: 16),
                  ],
                  if (exited.isNotEmpty) ...[
                    const Text('Exited', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.grey)),
                    const SizedBox(height: 10),
                    ...exited.map((v) => _visitorCard(v, showExit: false)),
                  ],
                  const SizedBox(height: 80),
                ]),
              ),
            ),
    );
  }

  Widget _chip(String label, String val, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
        child: Column(children: [
          Icon(icon, color: color, size: 20),
          Text(val, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ]),
      ),
    );
  }

  Widget _visitorCard(Map<String, dynamic> v, {required bool showExit}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            CircleAvatar(
              backgroundColor: Colors.teal.shade100,
              child: Text(v['name'].toString().substring(0, 1).toUpperCase(),
                style: TextStyle(color: Colors.teal.shade700, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(v['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              Text('ID: ${v['visitorId'] ?? v['idNumber'] ?? ''}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: v['status'] == 'inside' ? Colors.teal.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                v['status'] == 'inside' ? 'INSIDE' : 'EXITED',
                style: TextStyle(
                  color: v['status'] == 'inside' ? Colors.teal.shade700 : Colors.grey,
                  fontWeight: FontWeight.bold, fontSize: 11),
              ),
            ),
          ]),
          const SizedBox(height: 8),
          Text('Purpose: ${v['purpose'] ?? ''}', style: const TextStyle(fontSize: 13)),
          if ((v['hostName'] ?? '').isNotEmpty)
            Text('Host: ${v['hostName']}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          const SizedBox(height: 6),
          Row(children: [
            Icon(Icons.access_time, size: 13, color: Colors.grey.shade400),
            const SizedBox(width: 4),
            Text(
              'In: ${DateFormat('HH:mm').format(DateTime.parse(v['entryTime']).toLocal())}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            if (v['exitTime'] != null) ...[
              const SizedBox(width: 12),
              Text(
                'Out: ${DateFormat('HH:mm').format(DateTime.parse(v['exitTime']).toLocal())}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
            const Spacer(),
            if (showExit)
              TextButton.icon(
                onPressed: () => _markExit(v['_id']),
                icon: const Icon(Icons.exit_to_app, size: 16),
                label: const Text('Mark Exit', style: TextStyle(fontSize: 12)),
                style: TextButton.styleFrom(foregroundColor: Colors.teal),
              ),
          ]),
        ]),
      ),
    );
  }
}
