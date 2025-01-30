import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:developer' as log;
import 'package:http/http.dart' as http;

import 'package:flutter_payment_gateway/Keys.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  bool _isProcessing = false;

  String? _userId;
  final _baseUrl = "https://sandbox.momodeveloper.mtn.com";
  final reference = "e969c22e-f4bb-4080-9c58-aa3a64321d2b";

  //create reference id
  String generateReferenceId() {
    return DateTime.now().millisecondsSinceEpoch.toString();
  }

  // Create API User
  Future<dynamic> createApiUser() async {
    final url = '$_baseUrl/v1_0/apiuser';
    log.log("in create api user method");
    try {
      final response = await http.post(Uri.parse(url), headers: {
        'X-Reference-Id': reference,
        'Ocp-Apim-Subscription': PassKeys.PRIMARY_KEY,
        'Content-Type': "application/json",
      });
      log.log("Response create api user: $response");
      setState(() {
        _userId = reference;
      });
      return response;
    } catch (err) {
      log.log("Error: $err");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to Create API User"),
        ),
      );
    }
  }

  Future<dynamic> getCratedUserById() async {
    final url = '$_baseUrl/v1_0/apiuser/$_userId';
    try {
      final response = await http.get(Uri.parse(url), headers: {
        "Ocp-Apim-Subscription-Key": PassKeys.PRIMARY_KEY,
      });
      log.log("Response create user by id: $response");
      return response;
    } catch (err) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to get User"),
        ),
      );
    }
  }

  Future<String?> getUserAPIKey() async {
    final url = "$_baseUrl/v1_0/apiuser/$_userId/apiKey";
    try {
      final response = await http.post(Uri.parse(url), headers: {
        'Ocp-Apim-Subscription-Key': PassKeys.PRIMARY_KEY,
      });
      log.log("Response API KEY: $response");
      return response.body;
    } catch (err) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to API key"),
        ),
      );
      return null;
    }
  }

  // request api success token
  Future<String?> getAccessToken() async {
    final String url = "$_baseUrl/collection/token/";
    // final String url = "http://localhost:3000/get-token";

    final String userName = PassKeys.RFERENCE_ID;
    final String password = PassKeys.API_KEY;
    final String credentials = '$userName:$password';
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

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _isProcessing = false;
        });
        log.log('accessToken: $data');
        return data['access_token'];
      } else {
        log.log("Failed to obtain token: ${response.body}");
        setState(() {
          _isProcessing = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("Failed to get access token")));

        return null;
      }
    } on Exception catch (err) {
      log.log("Exception Failed to obtain token: $err");
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text("Failed to get access token")));
      return null;
    }
  }

// initiate payment request
  Future<void> requestPayment() async {
    setState(() {
      _isProcessing = true;
    });

    String? phoneNumber = _phoneController.text.trim();
    String? amount = _amountController.text.trim();

    if (phoneNumber.isEmpty || amount.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Please Enter Phone Number and Amount")));
      setState(() {
        _isProcessing = false;
      });
    }
    // await createApiUser();
    // await getCratedUserById();

    final String? token = await getAccessToken();
    log.log("AccessToken: $token");
    if (token == null) {
      setState(() {
        _isProcessing = false;
      });
      log.log("Error retrieving access token");
      return;
    }

    final String url =
        "https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay";
    final response = await http.post(
      Uri.parse(url),
      headers: {
        "Authorization": 'Bearer $token',
        "X-Reference-Id": reference,
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
    setState(() {
      _isProcessing = false;
    });
    if (response.statusCode == 200) {
      log.log("Payment request successfully");
    } else {
      log.log("Payment request failed: ${response.body}");
    }
  }

  Future<void> checkPaymentStatus(String referenceId) async {
    String? token = await getAccessToken();
    if (token == null) {
      log.log("Error retrieving access token");

      final String url =
          "https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/$referenceId";
      final response = await http.get(
        Uri.parse(url),
        headers: {
          "Authorization": "Bearer $token",
          "X-Target-Environment": "sandbox",
          'Ocp-Apim-Subscription-Key': PassKeys.PRIMARY_KEY,
        },
      );

      if (response.statusCode == 200) {
        log.log("Payment status: $response.body");
      } else {
        log.log("Failed ot check payment status: ${response.body}");
      }
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("MTN Momo Payment"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: 'Enter Phone Number'),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(labelText: 'Enter Amount'),
            ),
            SizedBox(height: 40),
            _isProcessing
                ? CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: requestPayment,
                    // onPressed: checkInternetWeb,
                    child: Text('Pay Now'),
                  ),
          ],
        ),
      ),
    );
  }
}
