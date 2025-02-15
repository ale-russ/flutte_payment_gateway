import 'dart:convert';

Message messageFromJson(String str) => Message.fromJson(json.decode(str));

class Message {
  String token;
  User user;

  Message({
    required this.token,
    required this.user,
  });

  factory Message.fromJson(Map<String, dynamic> json) =>
      Message(token: json['token'], user: User.fromJson(json['user']));

  Map<String, dynamic> toJson() => {"token": token, "user": user.toJson()};
}

class User {
  String id;
  String name;
  String email;
  String phoneNumber;

  User(
      {required this.id,
      required this.email,
      required this.name,
      required this.phoneNumber});

  factory User.fromJson(Map<String, dynamic> json) => User(
      id: json["id"],
      name: json["name"],
      email: json["email"],
      phoneNumber: json["phoneNumber"]);

  Map<String, dynamic> toJson() =>
      {"id": id, "name": name, "email": email, "phoneNumber": phoneNumber};
}
