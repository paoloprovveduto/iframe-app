import React from "react";
import { GroupOption, ListGroup } from "vtex.checkout-components";
import { PaymentFlag } from "vtex.payment-flags";
import styles from "../style.css";
import type { Payment } from "../typings/global";

// import { IconDelete } from "vtex.styleguide";

interface Props {
  handleNewCard: () => Promise<void>;
  handleSavedCard: (selectedAccount: Payment) => Promise<void>;
  availableAccounts: Payment[];
  selectedPayment: Payment | undefined
}

const CardSummary: React.FC<Props> = ({
  handleNewCard,
  handleSavedCard,
  availableAccounts,
  selectedPayment
}) => {
  return (
    <ListGroup>
      {availableAccounts?.length > 0 &&
        availableAccounts.map((availablePayment: Payment) => {
          const lastDigits = availablePayment.cardNumber.replace(/[^\d]/g, "");
          const paymentSystemId = availablePayment.paymentSystem;

          return (
            <GroupOption
              onClick={() => handleSavedCard(availablePayment)}
              key={availablePayment.accountId}
              caretAlign="center"
              className={selectedPayment?.accountId === availablePayment.accountId ? "option-selected" : ""}
            >
              <PaymentFlag paymentSystemId={paymentSystemId ?? ""} />
              <span>Che termina in ∙∙∙∙ {lastDigits}</span>
            </GroupOption>
          );
        })}
      <div className={`${styles.anotherCard} pa3`}>
        <span className="underline pointer f6" onClick={handleNewCard}>
          Usa un'altra carta
        </span>
      </div>
    </ListGroup>
    // <SelectedCard
    //   className="vw-100 w-auto-ns nl5 nl0-ns bg-muted-5 pa5 flex items-start lh-copy"
    //   onDeselect={onEdit}
    //   title={
    //     <span className="inline-flex items-center f5">
    //       <div className="h1 flex items-center">
    //         <PaymentFlag paymentSystemId={paymentSystem ?? ""} />
    //       </div>
    //       {lastDigits ? (
    //         <span className="ml3">
    //           Usa la carta di credito che termina con ∙∙∙∙ {lastDigits}
    //         </span>
    //       ) : (
    //         <span className="ml3">Inserisci i dati della carta</span>
    //       )}
    //     </span>
    //   }
    // />

    // <div
    //   className="vw-100 w-auto-ns nl5 nl0-ns bg-muted-5 pa5 flex items-start lh-copy"
    //   role="option"
    //   aria-selected
    // >
    //   <div className="flex w-100">
    //     <div className="flex flex-column">
    //       <span className="inline-flex items-center f5">
    //         {lastDigits ? (
    //           <span className="ml3">Usa la carta di credito che termina con ∙∙∙∙ {lastDigits}</span>
    //         ) : (
    //           <span className="ml3">Inserisci i dati della carta</span>
    //         )}
    //       </span>
    //     </div>
    //   </div>
    //   <button
    //     className="flex-shrink-0 c-muted-1 ml5 pa2 flex items-center bg-transparent bn pointer self-start"
    //     onClick={onEdit}
    //   >
    //     <IconDelete />
    //   </button>
    // </div>
  );
};

export default CardSummary;
