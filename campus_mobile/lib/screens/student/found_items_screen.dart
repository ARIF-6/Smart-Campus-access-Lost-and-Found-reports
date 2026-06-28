import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../models/found_item.dart';
import 'claim_request_screen.dart';

class FoundItemsScreen extends StatefulWidget {
  const FoundItemsScreen({super.key});

  @override
  State<FoundItemsScreen> createState() => _FoundItemsScreenState();
}

class _FoundItemsScreenState extends State<FoundItemsScreen> {
  final ApiService _apiService = ApiService();
  List<FoundItem> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchItems();
  }

  Future<void> _fetchItems() async {
    try {
      final response = await _apiService.get('/found-items');
      if (mounted) {
        setState(() {
          final data = response.data;
          List<dynamic> itemsList = [];
          if (data is List) {
            itemsList = data;
          } else if (data is Map && data.containsKey('items')) {
            itemsList = data['items'] as List<dynamic>? ?? [];
          }
          _items = itemsList
              .map((item) => FoundItem.fromJson(item as Map<String, dynamic>))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error fetching found items: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Found Items')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text('No found items reported yet'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  itemBuilder: (context, index) {
                    final item = _items[index];
                    final currentUserId = Provider.of<AuthProvider>(context, listen: false).user?['_id'];
                    final bool isOwner = item.foundBy == currentUserId;
                    final bool isReturned = ['returned', 'claimed', 'approved'].contains(item.status);

                    String buttonText;
                    if (isOwner) {
                      buttonText = 'Your Item';
                    } else if (isReturned) {
                      buttonText = 'Returned';
                    } else if (item.isClaimedByUser) {
                      buttonText = 'Claimed';
                    } else {
                      buttonText = 'Claim';
                    }

                    void handleTap() {
                      if (isOwner) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('You are the one who submitted this item.'),
                            backgroundColor: Colors.orange,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }
                      if (isReturned) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('This item has already been returned.'),
                            backgroundColor: Colors.orange,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                        return;
                      }
                      if (item.isClaimedByUser) return;
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => ClaimRequestScreen(item: item)),
                      );
                    }

                    // Status badge
                    Color badgeColor;
                    String badgeLabel;
                    switch (item.status) {
                      case 'available':
                        badgeColor = Colors.green;
                        badgeLabel = 'Available';
                        break;
                      case 'claimed':
                        badgeColor = Colors.orange;
                        badgeLabel = 'Claimed';
                        break;
                      default:
                        if (isOwner) {
                          badgeColor = Colors.blue;
                          badgeLabel = 'Your Item';
                        } else {
                          badgeColor = Colors.grey;
                          badgeLabel = item.status;
                        }
                    }

                    return Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: handleTap,
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  item.fullImageUrl,
                                  width: 100,
                                  height: 100,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.title,
                                        style: Theme.of(context).textTheme.titleMedium,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 4),
                                    Text('Location: ${item.location}',
                                        style: Theme.of(context).textTheme.bodySmall),
                                    Text('Reporter: ${item.foundBy}',
                                        style: Theme.of(context).textTheme.bodySmall),
                                    Text(item.description,
                                        style: Theme.of(context).textTheme.bodyMedium,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        TextButton(
                                          onPressed: () {
                                            // Placeholder for "See More" – navigate to details screen later
                                            handleTap();
                                          },
                                          child: const Text('See More'),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: badgeColor.withValues(alpha: 0.2),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: Text(
                                            badgeLabel,
                                            style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        Text(DateFormat.yMMMd().format(item.dateFound),
                                            style: Theme.of(context).textTheme.bodySmall),
                                      ],
                                    ),
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: ElevatedButton(
                                        onPressed: handleTap,
                                        child: Text(buttonText),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
