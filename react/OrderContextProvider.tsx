import React from "react";
import { OrderFormProvider } from "vtex.order-manager/OrderForm";
import { OrderPaymentProvider } from "vtex.order-payment/OrderPayment";

const OrderContextProvider: StorefrontFunctionComponent = ({ children }) => {
  return (
    <>
      <OrderFormProvider>
        <OrderPaymentProvider>{children}</OrderPaymentProvider>
      </OrderFormProvider>
    </>
  );
};

export default OrderContextProvider;
