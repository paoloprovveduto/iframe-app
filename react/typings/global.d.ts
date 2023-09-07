export type CardType = "new" | "saved";

export type PaymentSystem = {
  id: string;
  name: string;
  groupName: string;
  validator: Validator;
  stringId: string;
  requiresDocument: boolean;
  isCustom: boolean;
  description: string;
  requiresAuthentication: boolean;
  dueDate: string;
};

export type Validator = {
  regex: string;
  mask: string;
  cardCodeRegex: string;
  cardCodeMask: string;
  weights: number[];
  useCvv: boolean;
  useExpirationDate: boolean;
  useCardHolderName: boolean;
  useBillingAddress: boolean;
};

export type SetupIframeFunction = (
  retry?: number
) => void | SetupIframeFunction | ReturnType<typeof setTimeout>;

export type Payment = {
  accountId: string;
  bin: string;
  paymentSystem: string;
  cardNumber: string;
};

export interface CustomWindow extends Window {
  JSBridge: any;
  JSBridgeError: any;
  placeOrderComplete: (object: ResponseObject) => void;
  postRobot: any;
}

export interface ResponseObject {
  orderGroup: string;
  id: string;
  receiverUri: string;
  merchantTransactions: any;
  paymentData: any;
  gatewayCallbackTemplatePath: string;
}
