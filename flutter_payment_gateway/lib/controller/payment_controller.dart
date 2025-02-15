import 'dart:convert';
import 'dart:developer';

import 'package:flutter_payment_gateway/models/user_model.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../Keys.dart';
import '../models/Payment_Model.dart';

class PaymentController {
  final _baseUrl = "https://sandbox.momodeveloper.mtn.com";
  User? user;

  final uuid = Uuid();
  String generateReferenceId() {
    final String referenceId = uuid.v4();
    log("uuid: $referenceId");

    return referenceId;
  }

  // Create API User
  Future<dynamic> createApiUser() async {
    String reference = generateReferenceId();
    final url = '$_baseUrl/v1_0/apiuser';
    log("in create api user method");
    try {
      final response = await http.post(Uri.parse(url), body: {
        "providerCallbackHost": "string"
      }, headers: {
        'X-Reference-Id': reference,
        'Ocp-Apim-Subscription-Key': PassKeys.PRIMARY_KEY,
      });
      log("Response create api user: ${response.body}");

      log("Success creating api user");
      return response.body;
    } catch (err) {
      log("Error: $err");
      return;
    }
  }

  Future<dynamic> getCratedUserById(String _userId) async {
    final url = '$_baseUrl/v1_0/apiuser/$_userId';
    try {
      final response = await http.get(Uri.parse(url), headers: {
        "Ocp-Apim-Subscription-Key": PassKeys.PRIMARY_KEY,
      });
      log("Response create user by id: ${response.body}");
      return response.body;
    } catch (err) {
      log('Error: $err');
      return;
    }
  }

  Future<String?> getUserAPIKey(String reference) async {
    log("baseUrl: $_baseUrl");
    // final url = "$_baseUrl/v1_0/apiuser/$reference/apiKey";
    final urll =
        "https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/$reference/apikey";
    try {
      final response = await http.post(Uri.parse(urll), headers: {
        'Ocp-Apim-Subscription-Key': PassKeys.PRIMARY_KEY,
      });
      log("Response API KEY: ${response.body}");
      final newKey = jsonDecode(response.body);

      log("newKey: ${newKey['apiKey']}");

      return newKey['apiKey'];

      // return newKey;
    } catch (err) {
      log("Error: $err");

      return null;
    }
  }

  // request api success token
  Future<String?> getAccessToken(String reference, String _apiKey) async {
    final String url = "$_baseUrl/collection/token/";
    // final String url = "http://localhost:3000/get-token";
    await getUserAPIKey(reference);

    final String userName = reference;
    final String password = _apiKey;
    final String credentials = '$userName:$password';

    log("CREDENTIALS: $password ");
    try {
      final response = await http.post(Uri.parse(url), headers: {
        'Ocp-Apim-Subscription-Key': PassKeys.PRIMARY_KEY,
        "Authorization": "Basic ${base64Encode(utf8.encode(credentials))}",
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE, HEAD",
        "Access-Control-Allow-Headers":
            "Origin,Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,locale",
      });

      log("Response: ${response.body}");

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        return data['access_token'];
      } else {
        log("Failed to obtain token: ${response.body}");
        return null;
      }
    } on Exception catch (err) {
      log("Exception Failed to obtain token: $err");
      return null;
    }
  }

// initiate payment request
  Future<void> requestPayment(String phoneNumber, String amount,
      String reference, String apiKey) async {
    if (phoneNumber.isEmpty || amount.isEmpty) {
      return;
    }

    await createApiUser();
    await getCratedUserById(user!.id);

    final String? token = await getAccessToken(reference, apiKey);
    log("AccessToken: $token");
    if (token == null) {
      log("Error retrieving access token");
      return;
    }

    try {
      final String url =
          "https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay";
      final response = await http.post(
        Uri.parse(url),
        headers: {
          "Authorization": 'Bearer $token',
          // "X-Reference-Id": '445bd091-e9c1-4ce6-b55d-4fef774326ad',
          "X-Reference-Id": generateReferenceId().toString(),
          "X-Target-Environment": 'sandbox',
          'Ocp-Apim-Subscription-Key': PassKeys.PRIMARY_KEY,
          'Content-Type': "application/json",
        },
        body: jsonEncode({
          "amount": amount.toString(),
          "currency": "EUR",
          "externalId": "123456",
          "payer": {
            "partyIdType": "MSISDN",
            "partyId": phoneNumber,
          },
          "payerMessage": "Payment for services",
          "payeeNote": "Thank you for using our service",
        }),
      );
      log("Payment request failed: ${response.statusCode}");
    } on Exception catch (err) {
      log("Error: $err");
      return;
    }
  }

  Future<void> checkPaymentStatus(String referenceId, String apiKey) async {
    try {
      String? token = await getAccessToken(referenceId, apiKey);
      if (token == null) {
        log("Error retrieving access token");

        return;
      }

      final String url =
          "https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/ae0c583d-ac4d-440b-bfe2-c81f7c14a647";
      final response = await http.get(
        Uri.parse(url),
        headers: {
          "Authorization": "Bearer $token",
          "X-Target-Environment": "sandbox",
          'Ocp-Apim-Subscription-Key': PassKeys.PRIMARY_KEY,
        },
      );
      log("Response: ${response.body}");
      if (response.statusCode == 200) {
        log("Payment status: ${response.body}");
        final res = PaymentResponse.fromJson(jsonDecode(response.body));
        log("RES: $res");
        /* Navigator.push(
            context,
            MaterialPageRoute(
                builder: (context) => PaymentDetails(payment: res))); */
      } else {
        log("Failed ot check payment status: ${response.body}");
      }
    } on Exception catch (err) {
      log("Error: $err");
      return;
    }
  }
}
