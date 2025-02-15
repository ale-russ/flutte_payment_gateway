import 'dart:convert';
import 'dart:developer';
import 'package:flutter_payment_gateway/models/user_model.dart';
import 'package:http/http.dart' as http;

class AuthController {
  static const baseUrl = "http://localhost:5000/api";

  Future<String> login(String email, String password) async {
    log("Email: $email");
    log("Password: $password");
    try {
      final response = await http.post(Uri.parse('$baseUrl/auth/login'),
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({"email": email, "password": password}));

      final data = jsonDecode(response.body);
      if (data["message"] == "Invalid Credentials") {
        return "Invalid Credentials";
      }

      final userData = messageFromJson(response.body);
      final token = userData.token;
      log("Token: $token");
      log("Data: $data");

      return "success";
    } on Exception catch (err) {
      log("Error: $err");
      return "Unsuccessfull Login";
    }
  }

  Future<String> register(
      String email, String password, String name, String phoneNumber) async {
    try {
      final response = await http.post(Uri.parse('$baseUrl/auth/register'),
          headers: {"Content-Type": "application/json"},
          body: jsonEncode({
            "email": email,
            "password": password,
            "name": name,
            "phoneNumber": phoneNumber
          }));
      log('Response: ${response.body}');
      final data = jsonDecode(response.body);
      if (data['message'] == "User already exists") {
        return "User Already Exits";
      }

      log("Data: $data");
      return "success";
    } catch (err) {
      return "Unsuccessfull Registration";
    }
  }
}
