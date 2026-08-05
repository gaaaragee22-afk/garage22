"use client";

import { useMemo, useState } from "react";

import { LoaderCircle, LockKeyhole, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AddressStep from "@/components/checkout/AddressStep";
import CepStep from "@/components/checkout/CepStep";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import PaymentStep from "@/components/checkout/PaymentStep";
import PhoneStep from "@/components/checkout/PhoneStep";
import ReviewStep from "@/components/checkout/ReviewStep";

import { useStoreStatus } from "@/context/StoreStatusContext";
import { useCart } from "@/hooks/useCart";

import type {
  AddressData,
  CheckoutStep,
  CreatedOrder,
  PaymentData,
} from "@/types/checkout";

import { getDeliveryFee } from "@/utils/delivery";

const DEFAULT_CLOSED_MESSAGE =
  "No momento, nossa loja está fechada para novos pedidos.";

const initialAddress: AddressData = {
  cep: "",
  street: "",
  neighborhood: "",
  number: "",
  complement: "",
  reference: "",
  city: "",
  state: "",
};

const initialPayment: PaymentData = {
  method: "",
  changeFor: null,
  cardType: "",
  cardBrand: "",
};

interface PublicStoreStatus {
  isOpen: boolean;
  closedMessage: string;
  lastStatusChangeAt: string;
  updatedAt: string;
}

interface StoreStatusResponse {
  success: boolean;
  message?: string;
  store?: PublicStoreStatus;
}

interface CreateOrderResponse {
  success: true;
  message: string;

  order: {
    _id: string;
    orderNumber: string;

    customer: {
      phone: string;
    };

    address: AddressData;

    payment: {
      method: "cash" | "pix" | "card";
      changeFor: number | null;
      cardType: "debit" | "credit" | null;

      cardBrand:
        | "visa"
        | "mastercard"
        | "elo"
        | "hipercard"
        | "amex"
        | "other"
        | null;
    };

    subtotal: number;
    deliveryFee: number;
    total: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface CreateOrderErrorResponse {
  success: false;
  message?: string;
  code?: string;
}

type CreateOrderApiResponse = CreateOrderResponse | CreateOrderErrorResponse;

export default function CheckoutPage() {
  const router = useRouter();

  const {
    items,
    subtotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    canAddProducts,
    cartBlockedMessage,
  } = useCart();

  const {
    store,
    isOpen,
    isLoading: isLoadingStore,
    refreshStoreStatus,
  } = useStoreStatus();

  const [currentStep, setCurrentStep] = useState<CheckoutStep>("phone");

  const [phone, setPhone] = useState("");

  const [address, setAddress] = useState<AddressData>(initialAddress);

  const [payment, setPayment] = useState<PaymentData>(initialPayment);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState("");

  const deliveryFee = useMemo(() => {
    if (!address.city || !address.state) {
      return 0;
    }

    return getDeliveryFee(address.city, address.state);
  }, [address.city, address.state]);

  const total = useMemo(() => {
    return Number((subtotal + deliveryFee).toFixed(2));
  }, [subtotal, deliveryFee]);

  function updateAddress(data: Partial<AddressData>): void {
    setAddress((currentAddress) => ({
      ...currentAddress,
      ...data,
    }));
  }

  function updatePayment(data: Partial<PaymentData>): void {
    setPayment((currentPayment) => ({
      ...currentPayment,
      ...data,
    }));
  }

  async function getCurrentStoreStatus(): Promise<PublicStoreStatus | null> {
    try {
      const response = await fetch(
        `/api/store/status?timestamp=${Date.now()}`,
        {
          method: "GET",

          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },

          cache: "no-store",
        },
      );

      const data = (await response.json()) as StoreStatusResponse;

      if (!response.ok || !data.success || !data.store) {
        throw new Error(
          data.message || "Não foi possível verificar o funcionamento da loja.",
        );
      }

      return data.store;
    } catch (error) {
      console.error(
        "[Checkout] Erro ao consultar status atual da loja:",
        error,
      );

      return null;
    }
  }

  async function handleFinishOrder(): Promise<void> {
    if (isSubmitting) {
      return;
    }

    setSubmitError("");

    /*
     * Faz uma nova consulta imediatamente antes de criar
     * o pedido. Isso impede finalizar caso a loja tenha sido
     * fechada depois que o cliente abriu o checkout.
     */
    const currentStore = await getCurrentStoreStatus();

    if (!currentStore) {
      setSubmitError(
        "Não foi possível confirmar o funcionamento da loja. Tente novamente.",
      );

      return;
    }

    if (!currentStore.isOpen) {
      setSubmitError(currentStore.closedMessage || DEFAULT_CLOSED_MESSAGE);

      await refreshStoreStatus();

      return;
    }

    if (!canAddProducts || !isOpen) {
      setSubmitError(
        cartBlockedMessage || store?.closedMessage || DEFAULT_CLOSED_MESSAGE,
      );

      return;
    }

    if (items.length === 0) {
      setSubmitError(
        "Sua sacola está vazia. Adicione produtos antes de finalizar.",
      );

      return;
    }

    if (!phone.trim()) {
      setSubmitError("Informe o telefone do cliente.");

      setCurrentStep("phone");

      return;
    }

    if (
      !address.cep ||
      !address.street ||
      !address.neighborhood ||
      !address.number ||
      !address.city ||
      !address.state
    ) {
      setSubmitError("Preencha corretamente o endereço de entrega.");

      setCurrentStep("address");

      return;
    }

    if (!payment.method) {
      setSubmitError("Selecione uma forma de pagamento.");

      setCurrentStep("payment");

      return;
    }

    if (
      payment.method === "card" &&
      (!payment.cardType || !payment.cardBrand)
    ) {
      setSubmitError("Informe o tipo e a bandeira do cartão.");

      setCurrentStep("payment");

      return;
    }

    if (
      payment.method === "cash" &&
      payment.changeFor !== null &&
      payment.changeFor < total
    ) {
      setSubmitError(
        "O valor informado para troco não pode ser menor que o total do pedido.",
      );

      setCurrentStep("payment");

      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");

      const orderPayload = {
        customer: {
          phone: phone.trim(),
        },

        address: {
          cep: address.cep,
          street: address.street,
          neighborhood: address.neighborhood,
          number: address.number,

          complement: address.complement?.trim() ?? "",

          reference: address.reference?.trim() ?? "",

          city: address.city,
          state: address.state,
        },

        payment: {
          method: payment.method,

          changeFor: payment.method === "cash" ? payment.changeFor : null,

          cardType: payment.method === "card" ? payment.cardType : null,

          cardBrand: payment.method === "card" ? payment.cardBrand : null,
        },

        items: items.map((item) => {
          const price =
            typeof item.promotionalPrice === "number" &&
            item.promotionalPrice > 0 &&
            item.promotionalPrice < item.price
              ? item.promotionalPrice
              : item.price;

          return {
            productId: item._id,
            name: item.name,

            description: item.description ?? "",

            image: typeof item.image === "string" ? item.image : "",

            price: Number(price.toFixed(2)),

            quantity: item.quantity,

            total: Number((price * item.quantity).toFixed(2)),
          };
        }),

        subtotal: Number(subtotal.toFixed(2)),

        deliveryFee: Number(deliveryFee.toFixed(2)),

        total,
      };

      const response = await fetch("/api/orders", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(orderPayload),
      });

      const data = (await response.json()) as CreateOrderApiResponse;

      if (!response.ok) {
        if (
          response.status === 423 ||
          ("code" in data && data.code === "STORE_CLOSED")
        ) {
          await refreshStoreStatus();

          setSubmitError(
            data.message || "A loja foi fechada e não aceita novos pedidos.",
          );

          return;
        }

        throw new Error(data.message || "Não foi possível criar o pedido.");
      }

      if (!("order" in data) || !data.order) {
        throw new Error("O servidor não retornou os dados do pedido.");
      }

      const order = data.order;

      const createdOrder: CreatedOrder = {
        orderNumber: order.orderNumber,

        phone: order.customer.phone,

        address: order.address,

        payment: {
          method: order.payment.method,

          changeFor: order.payment.changeFor,

          cardType: order.payment.cardType ?? "",

          cardBrand: order.payment.cardBrand ?? "",
        },

        subtotal: order.subtotal,

        deliveryFee: order.deliveryFee,

        total: order.total,

        createdAt: order.createdAt,
      };

      sessionStorage.setItem(
        "@cardapio-online:last-order",
        JSON.stringify(createdOrder),
      );

      clearCart();

      router.replace("/pedido-finalizado");
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar o pedido.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /*
   * Enquanto o status da loja está sendo consultado,
   * o checkout não é exibido.
   */
  if (isLoadingStore) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-zinc-200 bg-white px-8 py-10 text-center shadow-sm">
          <LoaderCircle size={32} className="animate-spin text-[#7f3c19]" />

          <div>
            <h1 className="text-lg font-black text-zinc-900">
              Verificando a loja
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Aguarde enquanto confirmamos o funcionamento.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Impede acesso direto ao checkout quando a loja
   * estiver fechada.
   */
  if (!isOpen || !canAddProducts) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-[2rem] border border-red-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-700">
            <LockKeyhole size={35} />
          </div>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Loja fechada
          </span>

          <h1 className="mt-4 text-2xl font-black tracking-[-0.03em] text-zinc-950">
            Pedidos indisponíveis
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-600">
            {store?.closedMessage ||
              cartBlockedMessage ||
              DEFAULT_CLOSED_MESSAGE}
          </p>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
            Você pode visualizar o cardápio, mas não poderá finalizar pedidos
            até que a loja seja reaberta.
          </p>

          <button
            type="button"
            onClick={() => {
              void refreshStoreStatus();
            }}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
          >
            <Store size={18} />
            Verificar novamente
          </button>

          <Link
            href="/"
            className="mt-3 inline-flex h-12 items-center justify-center rounded-2xl bg-[#7f3c19] px-6 text-sm font-black text-white transition hover:bg-[#58141e]"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0 && !isSubmitting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fdf4c3] text-[#7f3c19]">
            <ShoppingBag size={34} />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-zinc-900">
            Sua sacola está vazia
          </h1>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-500">
            Adicione pelo menos um produto antes de iniciar a finalização do
            pedido.
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-[#7f3c19] px-6 font-semibold text-white transition hover:bg-[#58141e]"
          >
            Ver cardápio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-extrabold text-zinc-900">
            Garage
            <span className="text-[#7f3c19]">22</span>
          </Link>

          <div className="flex items-center gap-2 rounded-full bg-[#fdf4c3] px-4 py-2 text-sm font-semibold text-[#7f3c19]">
            <ShoppingBag size={17} />
            {items.reduce(
              (totalItems, item) => totalItems + item.quantity,
              0,
            )}{" "}
            itens
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">
            Finalizar pedido
          </h1>

          <p className="mt-2 text-sm text-zinc-500 sm:text-base">
            Preencha os dados abaixo para concluir a sua compra.
          </p>
        </div>

        <CheckoutSteps currentStep={currentStep} />

        <div className="mt-8">
          {currentStep === "phone" && (
            <PhoneStep
              phone={phone}
              onPhoneChange={setPhone}
              onContinue={() => {
                setSubmitError("");
                setCurrentStep("cep");
              }}
            />
          )}

          {currentStep === "cep" && (
            <CepStep
              cep={address.cep}
              onCepChange={(cep) => updateAddress({ cep })}
              onAddressFound={updateAddress}
              onContinue={() => {
                setSubmitError("");
                setCurrentStep("address");
              }}
              onBack={() => setCurrentStep("phone")}
            />
          )}

          {currentStep === "address" && (
            <AddressStep
              address={address}
              onAddressChange={setAddress}
              onContinue={() => {
                setSubmitError("");
                setCurrentStep("payment");
              }}
              onBack={() => setCurrentStep("cep")}
            />
          )}

          {currentStep === "payment" && (
            <PaymentStep
              payment={payment}
              total={total}
              onPaymentChange={updatePayment}
              onContinue={() => {
                setSubmitError("");
                setCurrentStep("review");
              }}
              onBack={() => setCurrentStep("address")}
            />
          )}

          {currentStep === "review" && (
            <ReviewStep
              phone={phone}
              address={address}
              payment={payment}
              items={items}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              isSubmitting={isSubmitting}
              error={submitError}
              onIncrease={increaseQuantity}
              onDecrease={decreaseQuantity}
              onRemove={removeFromCart}
              onEditPhone={() => setCurrentStep("phone")}
              onEditAddress={() => setCurrentStep("address")}
              onEditPayment={() => setCurrentStep("payment")}
              onBack={() => setCurrentStep("payment")}
              onFinish={handleFinishOrder}
            />
          )}
        </div>
      </div>
    </main>
  );
}
