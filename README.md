# Credit card form with VTEX iframe

This custom app allows the creation of a new VTEX IO page, containing the iframe for the insertion and elaboration of credit card data, in order to process and successfully complete the payment flow on mobile app.

## URL Details

The slug of the page is: "[/checkout/credit-card-form]()" and can eventually be reached on:

1. [https://secureqa.arcaplanet.it/checkout/credit-card-form](https://secureqa.arcaplanet.it/checkout/credit-card-form) on QA enviroment.
2. [https://secure.arcaplanet.it/checkout/credit-card-form](https://secure.arcaplanet.it/checkout/credit-card-form) in production.

**<u>At the moment we only have the app installed on QA.</u>**

## Requirements

1. In order for the iframe to properly work, the users have to land on this page with an **orderForm** already existing and filled with all the usual needed informations, so that we can access it with the VTEX **useOrderForm** hook imported from the **vtex.order-manager/OrderForm** app.

2. It is also needed that two cookies are present and available in the page: the **VTEX authentication cookie** and the **VTEX order form cookie**.

3. In the process, the iframe will need to update some payment fields of the **orderForm** with data inserted by the users. Currently we are using the **setPaymentField** method from the VTEX **useOrderPayment** hook that we import from the **vtex.order-payment/OrderPayment** app. If this implementation won't fit the requirements and a custom one is needed, then the iframe needs to be passed the custom method to call.

4. To be able to communicate with the mobile app, we will need two custom objects to be inserted into the page and then accessed as custom properties of the _window_: **window.JSBridge** and **window.JSBridgeError**.

## Flow and Events

1. The mobile app will handle all the checkout flow until the payment section. If the user selects the credit card payment method, the webview with the iframe will appear.

2. If the _orderForm_ **availableAccounts** field is populated, we retrieve the saved cards informations and we give the user the opportunity to complete the purchase with one of them.

3. Otherwise, if there are no saved cards, or if the user choose to use a new one, they will need to fill the form with new data.

4. In each of the cases, the iframe will fire some internal events:

   - **isCardValid**: will tell us if the inserted card is valid.
   - **getCardLastDigits**: if it is valid, we retrieve and save the last 4 digits.
   - **showCardErrors** (optional): we call it if the form is not correctly filled, or inserted data is not valid.

5) If inserted data is valid, we will tell the mobile app firing the event: **window.JSBridge.postMessage(“placeOrder”)**.

6. The mobile app will eventually be able to perform the _placeOrder_ API call and use the response object to call a javascript function that will tell the iframe to send VTEX the payment informations.

7. This javascript function is inside a `<script>` tag in the `<head>` of the document (we could also insert it as a custom property of the _window_ if needed):

   ```
   <script type="text/javascript">
      function placeOrderComplete(object: ReponseObject) {

         interface ResponseObject {
            orderGroup,
            id,
            receiverUri,
            merchantTransactions,
            paymentData,
            gatewayCallbackTemplatePath,
            ...optional fields
         }

   the object that must be passed as parameter is the placeOrder API response object, and will contain at least these mandatory parameters that will be used to send Vtex the payment informations

      }
   </script>
   ```

8. If the **sendPayments** event, internally fired by the iframe, lands successfully and we receive confirmation from Vtex, we tell it to mobile app, firing the event: **window.JSBridge.postMessage(“paymentInformationSent”)**.

9. Otherwise, if there is an error, we tell the app by firing the event: **window.JSBridgeError.postMessage(“paymentInformationSentError”)**.

10. At this point it's up to mobile app to handle the remaining purchase flow.
