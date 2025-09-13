# Xeno FDE Backend API Documentation

## Overview

This is a comprehensive API documentation for the Xeno FDE Backend service, designed for integration with Flutter web applications. The API provides endpoints for Shopify integration, webhook processing, metrics, and data management.

**Base URL:** `http://localhost:3000` (development) or `https://your-domain.com` (production)

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```dart
headers: {
  'Authorization': 'Bearer your-jwt-token-here',
  'Content-Type': 'application/json',
}
```

## Data Models

### Tenant Model
```dart
class Tenant {
  String id;
  String name;
  String email;
  String shopDomain;
  String? accessToken;
  bool active;
  DateTime createdAt;
  DateTime? lastOrderSync;
  DateTime? lastProductSync;
  DateTime? lastCustomerSync;
}
```

### Order Model
```dart
class Order {
  String id;
  String shopifyId;
  String? customerShopifyId;
  String? orderNumber;
  String? email;
  String? totalPrice;
  String? subtotalPrice;
  String? taxPrice;
  String currency;
  String? financialStatus;
  String? fulfillmentStatus;
  DateTime createdAt;
  DateTime? updatedAt;
  String tenantId;
}
```

### Product Model
```dart
class Product {
  String id;
  String shopifyId;
  String? title;
  String? handle;
  String? vendor;
  String? productType;
  String status;
  DateTime createdAt;
  DateTime updatedAt;
  String tenantId;
}
```

### Customer Model
```dart
class Customer {
  String id;
  String shopifyId;
  String? email;
  String? firstName;
  String? lastName;
  String? phone;
  DateTime createdAt;
  DateTime updatedAt;
  String tenantId;
}
```

### WebhookEvent Model
```dart
class WebhookEvent {
  String id;
  String? tenantId;
  String shopifyId;
  String topic;
  Map<String, dynamic> payload;
  bool processed;
  DateTime? processedAt;
  String? errorMessage;
  DateTime createdAt;
}
```

## API Endpoints

### 1. Health & Monitoring

#### GET /health
**Description:** Basic health check endpoint
**Authentication:** None required
**Rate Limit:** None

**Response:**
```dart
class HealthResponse {
  double uptime;
  String message;
  String timestamp;
  Map<String, dynamic> checks;
}

// Example Response
{
  "uptime": 1234.56,
  "message": "OK",
  "timestamp": "2025-01-13T10:30:00.000Z",
  "checks": {
    "database": {"status": "UP"},
    "redis": {"status": "UP"},
    "memory": {
      "status": "UP",
      "usage": {
        "rss": "79MB",
        "heapTotal": "32MB",
        "heapUsed": "19MB",
        "external": "3MB"
      }
    },
    "cpu": {
      "status": "UP",
      "usage": {
        "user": "0.174532s",
        "system": "0.053818s"
      }
    }
  }
}
```

#### GET /ready
**Description:** Kubernetes readiness check
**Authentication:** None required

**Response:**
```dart
class ReadyResponse {
  String status;
  String timestamp;
}
```

#### GET /live
**Description:** Kubernetes liveness check
**Authentication:** None required

**Response:**
```dart
class LiveResponse {
  String status;
  double uptime;
  String timestamp;
}
```

### 2. Authentication

#### POST /api/auth/login
**Description:** User login
**Authentication:** None required
**Rate Limit:** 10 requests per 15 minutes

**Request Body:**
```dart
class LoginRequest {
  String email;
  String password;
}
```

**Response:**
```dart
class LoginResponse {
  bool success;
  String message;
  String? token;
  User? user;
}

class User {
  String id;
  String email;
  String name;
  String? shopDomain;
}
```

**Flutter Example:**
```dart
Future<LoginResponse> login(String email, String password) async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/auth/login'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'email': email,
      'password': password,
    }),
  );
  
  if (response.statusCode == 200) {
    return LoginResponse.fromJson(jsonDecode(response.body));
  } else {
    throw Exception('Login failed');
  }
}
```

#### POST /api/auth/register
**Description:** User registration
**Authentication:** None required
**Rate Limit:** 10 requests per 15 minutes

**Request Body:**
```dart
class RegisterRequest {
  String name;
  String email;
  String password;
  String shopDomain;
}
```

### 3. Shopify Integration

#### GET /api/shopify/orders
**Description:** Get paginated list of orders
**Authentication:** Required
**Rate Limit:** 100 requests per 15 minutes

**Query Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 25, max: 100)
- `from` (string, optional): Start date (ISO 8601)
- `to` (string, optional): End date (ISO 8601)

**Response:**
```dart
class OrdersResponse {
  List<Order> orders;
  PaginationInfo pagination;
}

class PaginationInfo {
  int currentPage;
  int totalPages;
  int totalItems;
  int itemsPerPage;
  bool hasNextPage;
  bool hasPreviousPage;
}
```

**Flutter Example:**
```dart
Future<OrdersResponse> getOrders({
  int page = 1,
  int limit = 25,
  DateTime? from,
  DateTime? to,
}) async {
  final queryParams = {
    'page': page.toString(),
    'limit': limit.toString(),
  };
  
  if (from != null) {
    queryParams['from'] = from.toIso8601String();
  }
  if (to != null) {
    queryParams['to'] = to.toIso8601String();
  }
  
  final uri = Uri.parse('$baseUrl/api/shopify/orders').replace(
    queryParameters: queryParams,
  );
  
  final response = await http.get(
    uri,
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );
  
  if (response.statusCode == 200) {
    return OrdersResponse.fromJson(jsonDecode(response.body));
  } else {
    throw Exception('Failed to fetch orders');
  }
}
```

#### GET /api/shopify/products
**Description:** Get paginated list of products
**Authentication:** Required

**Query Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 25, max: 100)

**Response:**
```dart
class ProductsResponse {
  List<Product> products;
  PaginationInfo pagination;
}
```

#### GET /api/shopify/customers
**Description:** Get paginated list of customers
**Authentication:** Required

**Query Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 25, max: 100)

**Response:**
```dart
class CustomersResponse {
  List<Customer> customers;
  PaginationInfo pagination;
}
```

### 4. Metrics & Analytics

#### GET /api/metrics/dashboard
**Description:** Get dashboard metrics for the authenticated tenant
**Authentication:** Required

**Query Parameters:**
- `from` (string, optional): Start date (ISO 8601, default: 30 days ago)
- `to` (string, optional): End date (ISO 8601, default: now)

**Response:**
```dart
class DashboardMetrics {
  int totalCustomers;
  int totalOrders;
  int totalProducts;
  double totalRevenue;
  double webhookSuccessRate;
  List<OrdersByDay> ordersByDay;
  List<TopCustomer> topCustomers;
  DateRange period;
}

class OrdersByDay {
  String day;
  int orders;
  double revenue;
}

class TopCustomer {
  String email;
  String firstName;
  String lastName;
  double totalSpend;
}

class DateRange {
  String from;
  String to;
}
```

**Flutter Example:**
```dart
Future<DashboardMetrics> getDashboardMetrics({
  DateTime? from,
  DateTime? to,
}) async {
  final queryParams = <String, String>{};
  
  if (from != null) {
    queryParams['from'] = from.toIso8601String();
  }
  if (to != null) {
    queryParams['to'] = to.toIso8601String();
  }
  
  final uri = Uri.parse('$baseUrl/api/metrics/dashboard').replace(
    queryParameters: queryParams,
  );
  
  final response = await http.get(
    uri,
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );
  
  if (response.statusCode == 200) {
    return DashboardMetrics.fromJson(jsonDecode(response.body));
  } else {
    throw Exception('Failed to fetch dashboard metrics');
  }
}
```

#### GET /api/metrics/metrics
**Description:** Get Prometheus-compatible metrics
**Authentication:** None required

**Response:** Plain text format with Prometheus metrics

### 5. Webhook Management

#### GET /api/webhook-management/events
**Description:** Get webhook events for the authenticated tenant
**Authentication:** Required

**Query Parameters:**
- `page` (int, optional): Page number (default: 1)
- `limit` (int, optional): Items per page (default: 25)
- `status` (string, optional): Filter by status ('processed', 'failed', 'pending')
- `topic` (string, optional): Filter by webhook topic

**Response:**
```dart
class WebhookEventsResponse {
  List<WebhookEvent> events;
  PaginationInfo pagination;
}
```

#### POST /api/webhook-management/retry/:eventId
**Description:** Retry a failed webhook event
**Authentication:** Required

**Path Parameters:**
- `eventId` (string): ID of the webhook event to retry

**Response:**
```dart
class RetryResponse {
  bool success;
  String message;
  WebhookEvent? event;
}
```

#### POST /api/webhook-management/retry-failed/:tenantId
**Description:** Retry all failed webhook events for a tenant
**Authentication:** Required

**Path Parameters:**
- `tenantId` (string): ID of the tenant

**Request Body:**
```dart
class BulkRetryRequest {
  int? limit; // Maximum number of events to retry
}
```

#### POST /api/webhook-management/mark-failed/:eventId
**Description:** Mark a webhook event as failed
**Authentication:** Required

**Path Parameters:**
- `eventId` (string): ID of the webhook event

**Request Body:**
```dart
class MarkFailedRequest {
  String? errorMessage;
}
```

#### GET /api/webhook-management/stats/:tenantId
**Description:** Get webhook statistics for a tenant
**Authentication:** Required

**Path Parameters:**
- `tenantId` (string): ID of the tenant

**Query Parameters:**
- `days` (int, optional): Number of days to look back (default: 7)

**Response:**
```dart
class WebhookStats {
  int totalEvents;
  int processedEvents;
  int failedEvents;
  int pendingEvents;
  double successRate;
  Map<String, int> eventsByTopic;
  Map<String, int> eventsByStatus;
}
```

### 6. Webhook Processing

#### POST /api/webhooks
**Description:** Shopify webhook endpoint (used by Shopify, not your Flutter app)
**Authentication:** Shopify HMAC verification
**Rate Limit:** 50 requests per 15 minutes

**Headers Required:**
- `X-Shopify-Topic`: Webhook topic (e.g., 'orders/create')
- `X-Shopify-Shop-Domain`: Shop domain
- `X-Shopify-Hmac-Sha256`: HMAC signature

**Response:**
```dart
class WebhookResponse {
  bool success;
  String message;
  bool? idempotent; // true if webhook was already processed
}
```

## Error Handling

### Standard Error Response
```dart
class ApiError {
  String error;
  String? message;
  int? statusCode;
  Map<String, dynamic>? details;
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

### Flutter Error Handling Example
```dart
Future<T> handleApiCall<T>(Future<http.Response> Function() apiCall) async {
  try {
    final response = await apiCall();
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    } else if (response.statusCode == 401) {
      // Handle unauthorized - redirect to login
      throw UnauthorizedException('Please log in again');
    } else if (response.statusCode == 429) {
      // Handle rate limiting
      throw RateLimitException('Too many requests. Please try again later.');
    } else {
      final error = ApiError.fromJson(jsonDecode(response.body));
      throw ApiException(error.message ?? 'An error occurred');
    }
  } catch (e) {
    if (e is SocketException) {
      throw NetworkException('No internet connection');
    }
    rethrow;
  }
}
```

## Rate Limiting

The API implements rate limiting with the following limits:

- **General API:** 100 requests per 15 minutes
- **Webhook endpoints:** 50 requests per 15 minutes
- **Authentication endpoints:** 10 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when the limit resets (Unix timestamp)

## CORS Configuration

The API supports CORS for the following origins:
- `http://localhost:3000` (development)
- `http://localhost:3001` (development)
- Your production domain (configure in environment variables)

## Flutter Integration Example

### API Service Class
```dart
class ApiService {
  static const String baseUrl = 'http://localhost:3000';
  String? _token;
  
  void setToken(String token) {
    _token = token;
  }
  
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };
  
  Future<LoginResponse> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: _headers,
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
    
    return handleApiCall(() => Future.value(response));
  }
  
  Future<DashboardMetrics> getDashboardMetrics({
    DateTime? from,
    DateTime? to,
  }) async {
    final queryParams = <String, String>{};
    if (from != null) queryParams['from'] = from.toIso8601String();
    if (to != null) queryParams['to'] = to.toIso8601String();
    
    final uri = Uri.parse('$baseUrl/api/metrics/dashboard').replace(
      queryParameters: queryParams,
    );
    
    final response = await http.get(uri, headers: _headers);
    return handleApiCall(() => Future.value(response));
  }
  
  // Add more methods for other endpoints...
}
```

### Usage in Flutter Widget
```dart
class DashboardPage extends StatefulWidget {
  @override
  _DashboardPageState createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final ApiService _apiService = ApiService();
  DashboardMetrics? _metrics;
  bool _loading = true;
  
  @override
  void initState() {
    super.initState();
    _loadMetrics();
  }
  
  Future<void> _loadMetrics() async {
    try {
      final metrics = await _apiService.getDashboardMetrics();
      setState(() {
        _metrics = metrics;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading metrics: $e')),
      );
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Center(child: CircularProgressIndicator());
    }
    
    return Scaffold(
      appBar: AppBar(title: Text('Dashboard')),
      body: _metrics != null
          ? Column(
              children: [
                Text('Total Orders: ${_metrics!.totalOrders}'),
                Text('Total Revenue: \$${_metrics!.totalRevenue.toStringAsFixed(2)}'),
                Text('Success Rate: ${_metrics!.webhookSuccessRate.toStringAsFixed(1)}%'),
                // Add more metrics display...
              ],
            )
          : Center(child: Text('No data available')),
    );
  }
}
```

## Testing

### Health Check Test
```dart
Future<void> testHealthCheck() async {
  final response = await http.get(Uri.parse('$baseUrl/health'));
  print('Health Status: ${response.statusCode}');
  print('Response: ${response.body}');
}
```

### Authentication Test
```dart
Future<void> testLogin() async {
  final apiService = ApiService();
  try {
    final result = await apiService.login('test@example.com', 'password');
    print('Login successful: ${result.success}');
    if (result.token != null) {
      apiService.setToken(result.token!);
      print('Token set for future requests');
    }
  } catch (e) {
    print('Login failed: $e');
  }
}
```

This documentation provides everything you need to integrate the Xeno FDE Backend API with your Flutter web application. The API is designed to be RESTful, secure, and easy to use with proper error handling and rate limiting.
