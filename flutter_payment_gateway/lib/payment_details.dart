import 'package:flutter/material.dart';
import 'package:flutter_payment_gateway/models/Payment_Model.dart';

class PaymentDetails extends StatelessWidget {
  const PaymentDetails({super.key, required this.payment});
  final PaymentResponse payment;

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 16),
            ),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: true,
      ),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            _buildDetailRow('Transaction ID:', payment.financialTransactionId),
            _buildDetailRow('External ID:', payment.externalId),
            _buildDetailRow('Amount:', '${payment.amount} ${payment.currency}'),
            _buildDetailRow('Phone Number:', payment.payer.partyId),
            _buildDetailRow('Status:', payment.status),
            _buildDetailRow('Message:', payment.payerMessage),
            _buildDetailRow('Note:', payment.payeeNote),
          ],
        ),
      ),
    );
  }
}
