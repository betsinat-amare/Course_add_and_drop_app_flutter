import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/model/user.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:image_picker/image_picker.dart';
import 'package:course_add_and_drop/main.dart';
import 'package:dio/dio.dart';
import 'package:course_add_and_drop/core/network/dio_client.dart';

class ApiService {
  final Dio _dio = DioClient.instance;
  final String baseUrl = DioClient.getBaseUrl();

  Future<Map<String, dynamic>> signUp(User user, File? photo) async {
    try {
      var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/auth/signup'));
      request.fields.addAll(user.toJson().map((key, value) => MapEntry(key, value.toString())));
      if (photo != null) {
        request.files.add(await http.MultipartFile.fromPath('profile_photo', photo.path));
      }

      debugPrint('Sending signup request: ${user.toJson()}');
      final response = await request.send();
      final responseBody = await http.Response.fromStream(response);

      debugPrint('Sign-up response: ${response.statusCode} ${responseBody.body}');
      if (response.statusCode == 201) {
        return jsonDecode(responseBody.body);
      } else {
        final error = jsonDecode(responseBody.body)['error'] ?? 'Sign-up failed: ${response.statusCode}';
        throw Exception(error);
      }
    } catch (e) {
      debugPrint('Sign-up error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> checkIdAvailability(int id) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/auth/check-id/$id'));
      debugPrint('Check ID $id response: ${response.statusCode} ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'available': data['available'] ?? false,
          'role': data['role'],
          'error': data['error'],
        };
      } else {
        final error = jsonDecode(response.body)['error'] ?? 'Failed to check ID: ${response.statusCode}';
        throw Exception(error);
      }
    } catch (e) {
      debugPrint('Check ID error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      debugPrint('Attempting login to: $baseUrl/auth/login');
      final response = await _dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });

      debugPrint('Login response: ${response.statusCode} ${response.data}');
      if (response.statusCode == 200) {
        final data = response.data;
        debugPrint('Full login response data: $data');
        
        final token = data['token'] as String;
        final decoded = _decodeJwt(token);
        final role = decoded['role'] as String?;
        
        if (role == null) {
          throw Exception('Invalid token: role not found');
        }

        final prefs = await SharedPreferences.getInstance();
        
        // Clear any existing data first
        await prefs.clear();
        
        // Save new data with commit
        await prefs.setString('jwt_token', token);
        await prefs.setString('user_role', role);
        await prefs.setString('user_username', username);
        await prefs.commit(); // Force commit changes
        
        // Verify the data was saved
        final savedToken = prefs.getString('jwt_token');
        final savedRole = prefs.getString('user_role');
        
        if (savedToken == null || savedRole == null) {
          throw Exception('Failed to save login credentials');
        }
        
        debugPrint('API Service: Token saved: $savedToken');
        debugPrint('API Service: Role saved: $savedRole');
        debugPrint('API Service: Username saved: $username');

        // Ensure data is persisted
        await Future.delayed(const Duration(milliseconds: 500));

        return {
          'token': token,
          'role': role,
          'username': username,
        };
      } else {
        throw Exception(response.data['error'] ?? 'Login failed: ${response.statusCode}');
      }
    } on DioException catch (e) {
      _handleDioError(e, 'Login');
      throw Exception('Login failed');
    } catch (e) {
      debugPrint('Login error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );

      debugPrint('Forgot password response: ${response.statusCode} ${response.body}');
      if (response.statusCode == 200) {
        return {'message': 'Password reset instructions sent'};
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to send reset instructions: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Forgot password error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> createCourse({
    required String title,
    required String code,
    required String description,
    required String creditHours,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await http.post(
        Uri.parse('$baseUrl/courses'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'title': title,
          'code': code,
          'description': description,
          'credit_hours': creditHours,
        }),
      );

      debugPrint('Create course response: ${response.statusCode} ${response.body}');
      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to create course: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Create course error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<List<Map<String, dynamic>>> getCourses() async {
    try {
      final response = await _dio.get('/courses');
      debugPrint('Get courses response: ${response.statusCode} ${response.data}');
      
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      } else {
        throw Exception(response.data['error'] ?? 'Failed to fetch courses: ${response.statusCode}');
      }
    } on DioException catch (e) {
      _handleDioError(e, 'Get Courses');
      throw Exception('Failed to fetch courses');
    } catch (e) {
      debugPrint('Get courses error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<List<Map<String, dynamic>>> getAdds() async {
    try {
      final response = await _dio.get('/adds');
      debugPrint('Get adds response: ${response.statusCode} ${response.data}');
      
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      } else {
        throw Exception(response.data['error'] ?? 'Failed to fetch adds: ${response.statusCode}');
      }
    } on DioException catch (e) {
      _handleDioError(e, 'Get Adds');
      throw Exception('Failed to fetch adds');
    } catch (e) {
      debugPrint('Get adds error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> addCourse(int courseId) async {
    try {
      final response = await _dio.post('/adds', data: {'course_id': courseId});
      debugPrint('Add course response: ${response.statusCode} ${response.data}');
      
      if (response.statusCode == 201) {
        return response.data;
      } else {
        throw Exception(response.data['error'] ?? 'Failed to add course: ${response.statusCode}');
      }
    } on DioException catch (e) {
      _handleDioError(e, 'Add Course');
      throw Exception('Failed to add course');
    } catch (e) {
      debugPrint('Add course error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> dropCourse(int addId) async {
    try {
      final response = await _dio.post('/drops', data: {'add_id': addId});
      debugPrint('Drop course response: ${response.statusCode} ${response.data}');
      
      if (response.statusCode == 201) {
        return response.data;
      } else {
        throw Exception(response.data['error'] ?? 'Failed to drop course: ${response.statusCode}');
      }
    } on DioException catch (e) {
      _handleDioError(e, 'Drop Course');
      throw Exception('Failed to drop course');
    } catch (e) {
      debugPrint('Drop course error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> approveAdd(int addId, String status) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await http.put(
        Uri.parse('$baseUrl/admin/add/' + addId.toString() + '/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'status': status}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to approve add');
      }
    } catch (e) {
      debugPrint('Approve add error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    // Always attempt to clear local data immediately
    debugPrint('Attempting to clear local SharedPreferences on logout.');
    await prefs.clear();
    authNotifier.value = false; // Immediately update global auth state
    debugPrint('authNotifier set to false during logout.');

    try {
      final token = prefs.getString('jwt_token');
      if (token == null) {
        debugPrint('No token found for backend logout, but local data cleared.');
        return; // No token, no need to call backend
      }

      debugPrint('Calling backend logout endpoint: $baseUrl/logout with token: $token');
      final response = await http.get(
        Uri.parse('$baseUrl/logout'),
        headers: _getHeaders(token: token),
      );

      debugPrint('Backend logout response: ${response.statusCode} ${response.body}');

      if (response.statusCode == 200) {
        debugPrint('Backend logout successful.');
      } else {
        debugPrint('Backend logout failed with status ${response.statusCode}: ${response.body}');
        // Still allow the frontend to proceed as logged out locally
      }
    } catch (e) {
      debugPrint('Error during backend logout call: $e');
      // Frontend still proceeds as logged out locally
    }
  }

  Future<User> getUserProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      
      if (token == null) {
        throw Exception('No token found');
      }

      debugPrint('Making profile request with token: $token');
      final response = await http.get(
        Uri.parse('$baseUrl/auth/profile'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json',
        },
      );

      debugPrint('Get user profile response: ${response.statusCode} ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return User.fromJson(data);
      } else if (response.statusCode == 401) {
        // Instead of clearing token, return basic user info from token
        debugPrint('Received 401 from /profile API. Using token data instead.');
        final decoded = _decodeJwt(token);
        debugPrint('Decoded token data (error case): $decoded');
        
        // Create a basic user object from token data
        final user = User(
          id: decoded['id'] as int,
          username: prefs.getString('user_username') ?? '',
          password: '',
          email: '',
          fullName: '',
          role: decoded['role'] as String,
          profilePhoto: null,
        );
        debugPrint('Created user object from token (error case): ${user.toJson()}');
        return user;
      } else {
        throw Exception('Failed to get user profile: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Get user profile error: $e');
      // Instead of throwing, return basic user info from token
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token != null) {
        final decoded = _decodeJwt(token);
        return User(
          id: decoded['id'] as int,
          username: prefs.getString('user_username') ?? '',
          password: '',
          email: '',
          fullName: '',
          role: decoded['role'] as String,
          profilePhoto: null,
        );
      }
      throw Exception('Session expired. Please log in again.');
    }
  }

  Future<Map<String, dynamic>> requestDrop(int addId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await http.post(
        Uri.parse('$baseUrl/drops'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'add_id': addId}),
      );

      debugPrint('Request drop response: ${response.statusCode} ${response.body}');
      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to request drop: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Request drop error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<List<Map<String, dynamic>>> getDrops() async {
    try {
      final response = await _dio.get('/drops');
      debugPrint('Get drops response: ${response.statusCode} ${response.data}');
      
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(response.data);
      } else {
        throw Exception(response.data['error'] ?? 'Failed to fetch drops: ${response.statusCode}');
      }
    } on DioException catch (e) {
      _handleDioError(e, 'Get Drops');
      throw Exception('Failed to fetch drops');
    } catch (e) {
      debugPrint('Get drops error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> deleteCourse(String courseId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await http.delete(
        Uri.parse('$baseUrl/courses/$courseId'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      debugPrint('Delete course response: ${response.statusCode} ${response.body}');
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to delete course: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Delete course error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> updateCourse(String courseId, Map<String, dynamic> updatedData) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await http.put(
        Uri.parse('$baseUrl/courses/$courseId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(updatedData),
      );

      debugPrint('Update course response: ${response.statusCode} ${response.body}');
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to update course: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Update course error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<List<Map<String, dynamic>>> getDropRequests() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await http.get(
        Uri.parse('$baseUrl/drops'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      debugPrint('Get drop requests response: ${response.statusCode} ${response.body}');
      if (response.statusCode == 200) {
        return List<Map<String, dynamic>>.from(jsonDecode(response.body));
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to fetch drop requests: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Get drop requests error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> updateDropRequest(String requestId, String status) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await http.put(
        Uri.parse('$baseUrl/drops/$requestId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'approval_status': status}),
      );

      debugPrint('Update drop request response: ${response.statusCode} ${response.body}');
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to update drop request: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Update drop request error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> updateAddRequest(String requestId, String status) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await http.put(
        Uri.parse('$baseUrl/adds/$requestId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'approval_status': status}),
      );

      debugPrint('Update add request response: ${response.statusCode} ${response.body}');
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to update add request: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Update add request error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> updateProfile({
    required String fullName,
    required String username,
    required String email,
    XFile? profilePhotoXFile,
    String? newPassword,
  }) async {
    try {
      final formData = FormData.fromMap({
        'full_name': fullName,
        'username': username,
        'email': email,
        if (newPassword != null && newPassword.isNotEmpty) 'password': newPassword,
      });

      if (profilePhotoXFile != null) {
        formData.files.add(MapEntry(
          'profile_photo',
          await MultipartFile.fromFile(profilePhotoXFile.path, filename: profilePhotoXFile.name),
        ));
      }

      final response = await _dio.put('/auth/profile', data: formData);
      debugPrint('Profile update response: ${response.statusCode} ${response.data}');

      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw Exception(response.data['error'] ?? 'Failed to update profile');
      }
    } on DioException catch (e) {
      _handleDioError(e, 'Update Profile');
      throw Exception('Failed to update profile');
    } catch (e) {
      debugPrint('Profile update error: $e');
      throw Exception(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<Map<String, dynamic>> deleteProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');

      if (token == null) {
        throw Exception('No token found');
      }

      debugPrint('Attempting to delete profile with token: $token');
      final response = await http.delete(
        Uri.parse('$baseUrl/auth/profile'),
        headers: _getHeaders(token: token),
      );

      debugPrint('Delete profile response status: ${response.statusCode}');
      debugPrint('Delete profile response body: ${response.body}');

      if (response.statusCode == 200) {
        // Clear local data immediately after successful deletion
        await prefs.clear();
        authNotifier.value = false; // Update global auth state
        return json.decode(response.body);
      } else if (response.statusCode == 401) {
        throw Exception('Session expired');
      } else {
        final errorData = json.decode(response.body);
        throw Exception(errorData['error'] ?? 'Failed to delete profile');
      }
    } catch (e) {
      debugPrint('Error deleting profile: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> deleteAdd(String addId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      if (token == null) throw Exception('No token found');

      final response = await http.delete(
        Uri.parse('$baseUrl/adds/$addId'),
        headers: _getHeaders(token: token),
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception(json.decode(response.body)['error'] ?? 'Failed to delete add request');
      }
    } catch (e) {
      throw Exception('Failed to delete add request: $e');
    }
  }

  Map<String, dynamic> _decodeJwt(String token) {
    final parts = token.split('.');
    if (parts.length != 3) {
      throw Exception('Invalid token format');
    }

    final payload = parts[1];
    final normalized = base64Url.normalize(payload);
    final resp = utf8.decode(base64Url.decode(normalized));
    final payloadMap = json.decode(resp);
    return payloadMap;
  }

  Map<String, String> _getHeaders({required String token}) {
    return {
      'Authorization': 'Bearer $token',
    };
  }

  void _handleDioError(DioException e, String operation) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      throw Exception('Connection timed out. Please check your internet connection.');
    } else if (e.type == DioExceptionType.connectionError) {
      throw Exception('Could not connect to the server. Please check if the server is running.');
    } else if (e.response != null) {
      final errorData = e.response?.data;
      if (errorData is Map<String, dynamic> && errorData.containsKey('error')) {
        throw Exception(errorData['error']);
      } else if (errorData is Map<String, dynamic> && errorData.containsKey('message')) {
        throw Exception(errorData['message']);
      } else {
        throw Exception('$operation failed: ${e.response?.statusMessage ?? 'Unknown error'}');
      }
    } else {
      throw Exception('$operation failed: ${e.message ?? 'Unknown error'}');
    }
  }
} 