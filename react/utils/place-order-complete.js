export default async function placeOrderComplete(responseObject) {
  const {
    orderGroup: orderGroupId,
    id: transactionId,
    receiverUri,
    merchantTransactions,
    paymentData: { payments: transactionPayments },
    gatewayCallbackTemplatePath,
  } = responseObject;

  const iframe = document.querySelector("iframe#chk-card-form");

  if (merchantTransactions.length > 0) {
    const allPayments = transactionPayments.reduce(
      (_payments, transactionPayment) => {
        const merchantPayments = transactionPayment.merchantSellerPayments
          .map((merchantPayment) => {
            const merchantTransaction = merchantTransactions.find(
              (merchant) => merchant.id === merchantPayment.id
            );

            if (!merchantTransaction) {
              return null;
            }

            const { merchantSellerPayments, ...payment } = transactionPayment;

            return {
              ...payment,
              ...merchantPayment,
              currencyCode: "EUR",
              installmentsValue: merchantPayment.installmentValue,
              installmentsInterestRate: merchantPayment.interestRate,
              transaction: {
                id: merchantTransaction.transactionId,
                merchantName: merchantTransaction.merchantName,
              },
            };
          })
          .filter((merchantPayment) => merchantPayment != null);

        return _payments.concat(merchantPayments);
      },
      []
    );

    try {
      const { data } = await postRobot.send(
        iframe?.contentWindow,
        "sendPayments",
        {
          payments: allPayments,
          receiverUri,
          orderId: orderGroupId,
          gatewayCallbackTemplatePath,
          transactionId,
        }
      );
      window.location.href = data;
      window?.JSBridge?.postMessage("paymentInformationSent");
    } catch (err) {
      console.log(err);
      window?.JSBridgeError?.postMessage("paymentInformationSentError");
    }
  }
}
