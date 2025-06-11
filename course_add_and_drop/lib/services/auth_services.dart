import 'package:dio/dio.dart';
import 'package:course_add_and_drop/data/model/signup_request.dart';
import 'package:course_add_and_drop/data/model/user.dart';
import 'package:course_add_and_drop/core/network/dio_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  final Dio _dio = DioClient.instance;

  Future<User> signup(SignupRequest request) async {
    try {
      final response = await _dio.post('/auth/signup', data: request.toJson());
      
      if (response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;
        if (data.containsKey('message') && data['message'] == 'User registered successfully') {
          return User(
            id: 0,
            fullName: request.fullName,
            username: request.username,
            password: request.password,
            email: request.email,
            role: request.role,
            profilePhoto: request.profilePhoto,
          );
        }
      }
      
      return User.fromJson(response.data);
    } on DioException catch (e) {
      _handleDioError(e, 'Signup');
      throw Exception('Signup failed');
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
  }

  Future<User> login(String username, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });
      
      final user = User.fromJson(response.data);
      final token = response.data['token'] as String;
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('jwt_token', token);
      await prefs.setString('user_role', user.role);
      await prefs.setString('user_username', user.username);
      
      return user;
    } on DioException catch (e) {
      _handleDioError(e, 'Login');
      throw Exception('Login failed');
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
  }

  Future<User> getUserProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      
      if (token == null) {
        throw Exception('No token found');
      }

      final response = await _dio.get(
        '/auth/profile',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      
      return User.fromJson(response.data);
    } on DioException catch (e) {
      _handleDioError(e, 'Get Profile');
      throw Exception('Get profile failed');
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
  }

  Future<void> forgotPassword(String email) async {
    try {
      await _dio.post('/auth/forgot-password', data: {'email': email});
    } on DioException catch (e) {
      _handleDioError(e, 'Password Reset');
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
  }

  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      
      if (token != null) {
        await _dio.post(
          '/auth/logout',
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );
      }
      
      // Clear local storage
      await prefs.clear();
    } on DioException catch (e) {
      _handleDioError(e, 'Logout');
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
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
      throw Exception('$operation failed: ${e.message}');
    }
  }
}