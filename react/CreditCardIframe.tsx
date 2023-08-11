import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrderForm } from "vtex.order-manager/OrderForm";
import { useOrderPayment } from "vtex.order-payment/OrderPayment";
import { useRuntime, useSSR } from "vtex.render-runtime";
import { Button, Spinner } from "vtex.styleguide";
import CardSummary from "./components/CardSummary";
import styles from "./style.css";
import type { CardType, CustomWindow, Payment, PaymentSystem } from "./typings/global";

interface Props {}
// initialize the libraries inside variables
let postRobot: typeof import("post-robot") | null = null
let iFrameResize: typeof import("iframe-resizer") | null = null
declare let window: CustomWindow
// if we're on client we require libraries, in a kind of lazy loading
if (window?.document) {
  postRobot = require("post-robot")
  iFrameResize = require("iframe-resizer").iframeResize
}
// setup infos for the iframe
const IFRAME_APP_VERSION = "0.9.2"
const iframeURL = `https://io.vtexpayments.com.br/card-form-ui/${IFRAME_APP_VERSION}/index.html`

const CreditCardIframe: StorefrontFunctionComponent<Props> = ({}) => {
  const [iframeLoading, setIframeLoading] = useState<boolean>(true)
  const [selectedCreditCard, setSelectedCreditCard] = useState<PaymentSystem>()
  const [cardType, setCardType] = useState<CardType>("new")
  // const [cardLastDigits, setCardLastDigits] = useState<string>("")
  const [submitLoading, setSubmitLoading] = useState<boolean>(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const {
    culture: { locale }
  } = useRuntime()
  const isSSR = useSSR()
  const {orderForm: {id: orderFormId}, orderForm: {paymentData: {paymentSystems}}} = useOrderForm()
  const {referenceValue, setPaymentField, availableAccounts, payment} = useOrderPayment()

  const creditCardPaymentSystems = useMemo(() => {
    return paymentSystems.filter(
				(paymentSystem: PaymentSystem) =>
					paymentSystem.groupName === "creditCardPaymentGroup",
			)
  }, [paymentSystems])

  const setupIframe =
    (retry = 0) => {
      if (!creditCardPaymentSystems || creditCardPaymentSystems.length <= 0) return setTimeout(() => {
        setupIframe()
      }, 500)

      iFrameResize?.(
        {
          heightCalculationMethod: "documentElementOffset",
          checkOrigin: false,
          resizeFrom: "parent",
          autoResize: true,
        },
        iframeRef.current!
      );

      const stylesheetsUrls = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]")
      ).map((link) => link.href);

      postRobot
        ?.send(iframeRef.current!.contentWindow, "setup", {
          stylesheetsUrls,
          paymentSystems: creditCardPaymentSystems,
        })
        .catch((error: Error) => {
          console.log("Iframe setup error: " + error);
          if (retry && retry > 3) return setIframeLoading(false);
          return setupIframe(retry + 1);
        });
      return setIframeLoading(false);
    }

  const showCardErrors = useCallback(async () => {
    await postRobot.send(iframeRef.current!.contentWindow, 'showCardErrors')
  }, [])

  const handleNewCard = useCallback(async () => {
    setIframeLoading(true)

    await setPaymentField({
      accountId: null,
      bin: null,
      referenceValue
    })

    setCardType("new")
    setIframeLoading(false)
	}, [setPaymentField])

  const handleSavedCard = useCallback(async (selectedAccount: Payment) => {
    setIframeLoading(true)

    const {accountId, bin, paymentSystem} = selectedAccount
    await setPaymentField({
      accountId,
      bin,
      paymentSystem,
      referenceValue
    })

    setCardType("saved")
    setIframeLoading(false)
  }, [setPaymentField])

  const handleSubmit = async () => {
    setSubmitLoading(true)

    try {
      const { data: cardIsValid } = await postRobot.send(
        iframeRef.current!.contentWindow,
        'isCardValid'
      )

      if (!selectedCreditCard || !cardIsValid) {
        showCardErrors()
        return
      }

      if (cardType === 'new') {
        await postRobot.send(
          iframeRef.current!.contentWindow,
          'getCardLastDigits'
        )

        await setPaymentField({
          accountId: null,
          bin: null,
          paymentSystem: selectedCreditCard.id,
          referenceValue
        })
      }

      // Qui dobbiamo comunicare all'app che può procedere al placeOrder tramite JSBridge.postMessage("placeOrder")

      window?.JSBridge?.postMessage("placeOrder") // ????????????????
      
    } finally {
      setSubmitLoading(false)
    }
  }
  
  const htmlScript = `async function placeOrderComplete(responseObject) {
    const {
        orderGroup: orderGroupId,
        id: transactionId,
        receiverUri,
        merchantTransactions,
        paymentData: { payments: transactionPayments },
        gatewayCallbackTemplatePath,
      } = responseObject

    const iframe = document.querySelector("iframe#chk-card-form")

    if (merchantTransactions.length > 0) {
      const allPayments = transactionPayments.reduce(
        (_payments, transactionPayment) => {
          const merchantPayments = transactionPayment.merchantSellerPayments
            .map((merchantPayment) => {
              const merchantTransaction = merchantTransactions.find(
                (merchant) => merchant.id === merchantPayment.id,
              )

              if (!merchantTransaction) {
                return null
              }

              const { merchantSellerPayments, ...payment } = transactionPayment

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
              }
            })
            .filter((merchantPayment) => merchantPayment != null)

          return _payments.concat(merchantPayments)
        },
        []
      )

      try {
        const { data } = await postRobot.send(
          iframe.contentWindow,
          "sendPayments",
          {
            payments: allPayments,
            receiverUri,
            orderId: orderGroupId,
            gatewayCallbackTemplatePath,
            transactionId,
          },
        )
        window?.location?.href = data
        window?.JSBridge?.postMessage("paymentInformationSent")
      } catch(err) {
        console.log(err)
        window?.JSBridgeError?.postMessage("paymentInformationSentError")
      }
    }
  }`

  useEffect(function createPaymentSystemListener() {
    const listener = postRobot?.on(
      "paymentSystem",
      ({ data }: { data: PaymentSystem }) => {
        setSelectedCreditCard(data)
      }
    );
    
    return () => listener?.cancel();
  }, []);

  useEffect(() => {
    window.postRobot = postRobot;
    const head = document.querySelector("head")
    const placeOrderScript = document.createElement("script");
    placeOrderScript.type = "text/javascript";
    placeOrderScript.innerHTML = htmlScript
    head?.appendChild(placeOrderScript);

    // return () => {
    //   head?.removeChild(placeOrderScript);
    // }
  }, [])

  useEffect(() => {
    if (availableAccounts.length > 0) {
      const updatePaymentField = async () => {
        const {accountId, bin, paymentSystem} = availableAccounts[0]
        await setPaymentField({
          accountId,
          bin,
          paymentSystem
        })
      }
      updatePaymentField()
      setCardType("saved")
    }
  }, [availableAccounts.length])

  if (isSSR) {
    return null;
  }

  return (
    <div className="relative w-100 pa5">
      {iframeLoading && (
        <div className="w-100 h-100 z-1 flex items-center justify-center">
          <span className="c-ation-primary">
            <Spinner />
          </span>
        </div>
      )}
      
      {paymentSystems.length > 0 && orderFormId && (
        <>
        {cardType === "saved" && (
          <div className={`${styles.cardSummaryContainer} mb5`}>
            <CardSummary
              // lastDigits={cardType === "new" ? undefined : cardLastDigits}
              handleNewCard={handleNewCard}
              handleSavedCard={handleSavedCard}
              // paymentSystem={selectedCreditCard?.id ?? undefined}
              availableAccounts={availableAccounts}
              selectedPayment={payment}
            />
          </div>
        )}
          <iframe
            id="chk-card-form"
            /* className={classNames(styles.iframe, 'vw-100 w-auto-ns nl5 nh0-ns', {
              [styles.newCard]: cardType === 'new',
              [styles.savedCard]: cardType === 'saved',
            })} */
            className={`${styles.creditCardIframe} db vw-100 w-auto-ns nl5 nh0-ns`}
            title={"Form per le carte di credito 40"}
            // The scrolling attribute is set to 'no' in the iframe tag, as older versions of IE don't allow
            // this to be turned off in code and can just slightly add a bit of extra space to the bottom
            // of the content that it doesn't report when it returns the height.
            src={`${iframeURL}?locale=${locale}&cardType=${cardType}`}
            onLoad={() => setupIframe()}
            ref={iframeRef}
          />
        </>
      )}
      
      {!iframeLoading && (
        <div className="flex w-100 justify-center mt5">
          <Button
            size="large"
            block
            onClick={handleSubmit}
            isLoading={submitLoading}
            className={`${styles.proceedButton}`}
          >
            <span className="f5">
              Conferma dati
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};

CreditCardIframe.schema = {
  title: "editor.countdown.title",
  description: "editor.countdown.description",
  type: "object",
  properties: {},
};

export default CreditCardIframe;
