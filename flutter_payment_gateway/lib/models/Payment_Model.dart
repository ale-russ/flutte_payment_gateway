class PaymentResponse {
  final String financialTransactionId;
  final String externalId;
  final String amount;
  final String currency;
  final Payer payer;
  final String payerMessage;
  final String payeeNote;
  final String status;

  PaymentResponse({
    required this.financialTransactionId,
    required this.externalId,
    required this.amount,
    required this.currency,
    required this.payer,
    required this.payerMessage,
    required this.payeeNote,
    required this.status,
  });

  factory PaymentResponse.fromJson(Map<String, dynamic> json) {
    return PaymentResponse(
      financialTransactionId: json['financialTransactionId'],
      externalId: json['externalId'],
      amount: json['amount'],
      currency: json['currency'],
      payer: Payer.fromJson(json['payer']),
      payerMessage: json['payerMessage'],
      payeeNote: json['payeeNote'],
      status: json['status'],
    );
  }
}

class Payer {
  final String partyIdType;
  final String partyId;

  Payer({
    required this.partyIdType,
    required this.partyId,
  });

  factory Payer.fromJson(Map<String, dynamic> json) {
    return Payer(
      partyIdType: json['partyIdType'],
      partyId: json['partyId'],
    );
  }
}
