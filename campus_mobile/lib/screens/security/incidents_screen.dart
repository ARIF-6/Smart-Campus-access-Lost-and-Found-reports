import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants.dart';
import '../../services/api_service.dart';

class IncidentsScreen extends StatefulWidget {
  const IncidentsScreen({super.key});
  @override
  State<IncidentsScreen> createState() => _IncidentsScreenState();
}

class _IncidentsScreenState extends State<IncidentsScreen> with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  late TabController _tabController;
  List<dynamic> _incidents = [];
  List<String> _incidentCategories = [];
  List<String> _campuses = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchIncidents();
    _fetchIncidentCategories();
    _fetchCampuses();
  }

  Future<void> _fetchCampuses() async {
    try {
      final res = await _api.get('/university/campuses');
      final List<dynamic> list = res.data;
      if (mounted) {
        setState(() {
          _campuses = list.map((c) => c['name'] as String).toList();
        });
      }
    } catch (_) {}
  }


  Future<void> _fetchIncidentCategories() async {
    try {
      final res = await _api.get('/categories/incident');
      final List<dynamic> list = res.data;
      if (mounted) {
        setState(() {
          _incidentCategories = list.map((item) => item['name'] as String).toList();
        });
      }
    } catch (_) {}
  }


  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchIncidents() async {
    if (mounted) setState(() => _loading = true);
    try {
      final res = await _api.get('/security/incidents');
      if (mounted) setState(() { _incidents = res.data; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showReportDialog() {
    final defaultTypes = ['unauthorized_access', 'suspicious_person', 'no_id', 'disturbance', 'theft', 'other'];
    final types = _incidentCategories.isNotEmpty ? _incidentCategories : defaultTypes;
    String selectedType = types[0];
    String selectedSeverity = 'medium';
    final descCtrl = TextEditingController();
    final locCtrl = TextEditingController();
    final nameCtrl = TextEditingController();

    final campusesList = _campuses.isNotEmpty ? _campuses : ['Main Gate', 'Library', 'Science Building'];
    String selectedLocation = campusesList[0];
    locCtrl.text = selectedLocation;


    final themeColor = const Color(0xFF4C3BCF);

    Widget buildFormCard(List<Widget> children) {
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: children,
        ),
      );
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Container(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, top: 24, left: 20, right: 20),
          decoration: const BoxDecoration(
            color: Color(0xFFF8FAFC),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
                      child: Icon(Icons.warning_amber_rounded, color: Colors.red.shade700, size: 28),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Report Incident', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                        Text('Log unauthorized access or security event', style: TextStyle(color: Colors.grey, fontSize: 12)),
                      ]),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                
                // Category Card
                buildFormCard([
                  Text(
                    'Category',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: selectedType,
                    decoration: InputDecoration(
                      hintText: 'Select category',
                      prefixIcon: Icon(Icons.list_alt_rounded, size: 20, color: themeColor),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                    ),
                    items: types.map((t) => DropdownMenuItem(
                      value: t,
                      child: Text(t.replaceAll('_', ' ').toUpperCase(), style: const TextStyle(fontSize: 14)),
                    )).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModal(() {
                          selectedType = val;
                        });
                      }
                    },
                  ),
                ]),
                
                const SizedBox(height: 24),
                
                // Description title
                const Padding(
                  padding: EdgeInsets.only(left: 4, bottom: 12),
                  child: Text(
                    'Description',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ),
                
                // Description Card
                buildFormCard([
                  Text(
                    'Detailed Description',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: descCtrl,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Describe the problem in detail...',
                      prefixIcon: Padding(
                        padding: const EdgeInsets.only(bottom: 50.0),
                        child: Icon(Icons.description_rounded, size: 20, color: themeColor),
                      ),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                    ),
                  ),
                ]),

                const SizedBox(height: 24),

                // Additional Details Card
                buildFormCard([
                  Text(
                    'Severity',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: selectedSeverity,
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.warning_amber_rounded, size: 20, color: themeColor),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'low', child: Text('LOW')),
                      DropdownMenuItem(value: 'medium', child: Text('MEDIUM')),
                      DropdownMenuItem(value: 'high', child: Text('HIGH')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setModal(() {
                          selectedSeverity = val;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Campus / Location',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: selectedLocation,
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.location_on_rounded, size: 20, color: themeColor),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                    ),
                    items: campusesList.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModal(() {
                          selectedLocation = val;
                          locCtrl.text = val;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Person Involved (optional)',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(
                      hintText: 'Enter name',
                      prefixIcon: Icon(Icons.person_rounded, size: 20, color: themeColor),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Colors.grey.shade200)),
                    ),
                  ),
                ]),

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.shade700,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () async {
                      if (descCtrl.text.trim().isEmpty) return;
                      Navigator.pop(ctx);
                      try {
                        await _api.post('/security/incidents', data: {
                          'type': selectedType,
                          'severity': selectedSeverity,
                          'description': descCtrl.text.trim(),
                          'location': locCtrl.text.trim(),
                          'personInvolved': {'name': nameCtrl.text.trim()},
                        });
                        _fetchIncidents();
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('✅ Incident reported'), backgroundColor: Colors.green));
                        }
                      } catch (_) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Failed to submit'), backgroundColor: Colors.red));
                        }
                      }
                    },
                    child: const Text('SUBMIT REPORT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, {int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
      ],
    );
  }

  Color _severityColor(String s) {
    if (s == 'high') return Colors.red.shade700;
    if (s == 'medium') return Colors.orange;
    return Colors.green.shade600;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Incident Reports'),
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppConstants.primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppConstants.primaryColor,
          tabs: const [Tab(text: 'All Incidents'), Tab(text: 'High Severity')],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showReportDialog,
        backgroundColor: Colors.red.shade700,
        icon: const Icon(Icons.add_alert, color: Colors.white),
        label: const Text('Report', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildList(_incidents),
                _buildList(_incidents.where((i) => i['severity'] == 'high').toList()),
              ],
            ),
    );
  }

  Widget _buildList(List<dynamic> items) {
    if (items.isEmpty) {
      return Center(
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Icon(Icons.shield_outlined, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 12),
          Text('No incidents found', style: TextStyle(color: Colors.grey.shade500)),
        ]),
      );
    }
    return RefreshIndicator(
      onRefresh: _fetchIncidents,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        itemBuilder: (_, i) => _buildCard(items[i]),
      ),
    );
  }

  Widget _buildCard(Map<String, dynamic> inc) {
    final sev = inc['severity'] ?? 'medium';
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: _severityColor(sev).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
              child: Text(sev.toUpperCase(), style: TextStyle(color: _severityColor(sev), fontWeight: FontWeight.bold, fontSize: 11)),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                (inc['type'] ?? '').toString().replaceAll('_', ' ').toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
            Text(
              DateFormat('MM/dd HH:mm').format(DateTime.parse(inc['createdAt'])),
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ]),
          const SizedBox(height: 8),
          Text(inc['description'] ?? '', style: const TextStyle(fontSize: 13)),
          const SizedBox(height: 6),
          Row(children: [
            Icon(Icons.location_on, size: 13, color: Colors.grey.shade400),
            Text(inc['location'] ?? 'Main Gate', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const Spacer(),
            Icon(Icons.person_outline, size: 13, color: Colors.grey.shade400),
            Text(inc['reportedBy']?['fullName'] ?? 'Guard', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ]),
        ]),
      ),
    );
  }
}
