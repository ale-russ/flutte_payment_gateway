import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:convert';
import 'dart:developer';
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
  bool _isLoading = false;

  String? _userId;
  final _baseUrl = "https://sandbox.momodeveloper.mtn.com";
  final reference = "98886195-2446-4551-86d2-5818a8443e76";

  // ignore: non_constant_identifier_names
  String? _apiKey = "";

  //create reference id

  // Create API User
  Future<dynamic> createApiUser() async {
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

      setState(() {
        _userId = reference;
      });
      log("Success creating api user");
      return response.body;
    } catch (err) {
      log("Error: $err");
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
      log("Response create user by id: ${response.body}");
      return response.body;
    } catch (err) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to get User"),
        ),
      );
    }
  }

  Future<String?> getUserAPIKey() async {
    log("baseUrl: $_baseUrl");
    final url = "$_baseUrl/v1_0/apiuser/$reference/apiKey";
    final urll =
        "https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/$reference/apikey";
    try {
      final response = await http.post(Uri.parse(urll), headers: {
        'Ocp-Apim-Subscription-Key': PassKeys.PRIMARY_KEY,
      });
      log("Response API KEY: ${response.body}");
      final newKey = jsonDecode(response.body);

      setState(() {
        _apiKey = newKey['apiKey'];
      });

      log("API KEY: $_apiKey");
      return newKey;
    } catch (err) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to fetch API key"),
        ),
      );
      return null;
    }
  }

  // request api success token
  Future<String?> getAccessToken() async {
    final String url = "$_baseUrl/collection/token/";
    // final String url = "http://localhost:3000/get-token";

    final String userName = reference;
    final String password = _apiKey!;
    final String credentials = '$userName:$password';

    log("credentials: $credentials");
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
        setState(() {
          _isProcessing = false;
        });
        log('accessToken: $data');
        return data['access_token'];
      } else {
        log("Failed to obtain token: ${response.body}");
        setState(() {
          _isProcessing = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text("Failed to get access token")));

        return null;
      }
    } on Exception catch (err) {
      log("Exception Failed to obtain token: $err");
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text("Failed to get access token")));
      setState(() {
        _isProcessing = false;
      });
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
    /* await createApiUser();
    await getCratedUserById(); */

    final String? token = await getAccessToken();
    log("AccessToken: $token");
    if (token == null) {
      setState(() {
        _isProcessing = false;
      });
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
        log("Payment request successfully");
      } else {
        log("Payment request failed: ${response.body}");
      }
    } on Exception catch (err) {
      log("Error: $err");
      ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Payment Request Failed! Please Try Again")));
    }
  }

  Future<void> checkPaymentStatus(String referenceId) async {
    setState(() {
      _isLoading = true;
    });
    try {
      String? token = await getAccessToken();
      if (token == null) {
        log("Error retrieving access token");
        setState(() {
          _isLoading = false;
        });
        return;
      }

      final String url =
          "https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay/$reference";
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
      } else {
        log("Failed ot check payment status: ${response.body}");
      }
    } on Exception catch (err) {
      log("Error: $err");
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text("$err")));
    }

    setState(() {
      _isLoading = false;
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Widget paymentInformation = Column(
    children: [
      Text("Payment Information"),
      SizedBox(height: 20),
    ],
  );

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
            const SizedBox(height: 40),
            _isLoading
                ? CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: () => checkPaymentStatus(reference),
                    child: Text('Payment Status'),
                  ),
            const SizedBox(height: 40),
            paymentInformation
          ],
        ),
      ),
    );
  }
}
