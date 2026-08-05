"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { useStoreStatus } from "@/context/StoreStatusContext";

export interface CartProduct {
  _id: string;
  name: string;
  description?: string;
  price: number;
  promotionalPrice?: number | null;
  image?: string;
}

export interface CartItem extends CartProduct {
  quantity: number;
  observation?: string;
}

export interface CartMutationResult {
  success: boolean;
  message: string;
}

export interface CartContextData {
  items: CartItem[];

  totalItems: number;

  /**
   * Valor dos produtos sem taxa de entrega.
   */
  subtotal: number;

  /**
   * Nome alternativo mantido para compatibilidade
   * com componentes antigos.
   */
  totalPrice: number;

  isCartOpen: boolean;

  /**
   * Informa se a loja permite adicionar ou aumentar produtos.
   */
  canAddProducts: boolean;

  /**
   * Mensagem de bloqueio devolvida pelo funcionamento da loja.
   */
  cartBlockedMessage: string;

  addToCart: (product: CartProduct, quantity?: number) => CartMutationResult;

  removeFromCart: (productId: string) => void;

  increaseQuantity: (productId: string) => CartMutationResult;

  decreaseQuantity: (productId: string) => void;

  updateQuantity: (productId: string, quantity: number) => CartMutationResult;

  updateObservation: (productId: string, observation: string) => void;

  clearCart: () => void;

  openCart: () => void;

  closeCart: () => void;

  toggleCart: () => void;
}

export const CartContext = createContext<CartContextData | undefined>(
  undefined,
);

interface CartProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "@cardapio-online:cart";

const CART_UPDATED_EVENT = "cardapio-online-cart-updated";

const DEFAULT_CLOSED_MESSAGE =
  "No momento, nossa loja está fechada para novos pedidos.";

const CHECKING_STORE_MESSAGE =
  "Aguarde enquanto verificamos o funcionamento da loja.";

function getValidProductPrice(product: CartProduct): number {
  const normalPrice = Number(product.price);

  const promotionalPrice =
    product.promotionalPrice !== null && product.promotionalPrice !== undefined
      ? Number(product.promotionalPrice)
      : null;

  const hasValidPromotion =
    promotionalPrice !== null &&
    Number.isFinite(promotionalPrice) &&
    promotionalPrice > 0 &&
    promotionalPrice < normalPrice;

  return hasValidPromotion ? promotionalPrice : normalPrice;
}

function normalizeCartProduct(product: CartProduct): CartProduct {
  const price = Number(product.price);

  const promotionalPriceValue =
    product.promotionalPrice !== null && product.promotionalPrice !== undefined
      ? Number(product.promotionalPrice)
      : null;

  const promotionalPrice =
    promotionalPriceValue !== null &&
    Number.isFinite(promotionalPriceValue) &&
    promotionalPriceValue > 0 &&
    promotionalPriceValue < price
      ? promotionalPriceValue
      : null;

  return {
    ...product,
    price,
    promotionalPrice,
  };
}

function getServerSnapshot(): string {
  return "[]";
}

function getCartSnapshot(): string {
  if (typeof window === "undefined") {
    return "[]";
  }

  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function subscribeToCart(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  }

  function handleCartUpdate() {
    callback();
  }

  window.addEventListener("storage", handleStorage);

  window.addEventListener(CART_UPDATED_EVENT, handleCartUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);

    window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdate);
  };
}

function parseCartItems(storedCart: string): CartItem[] {
  try {
    const parsedItems = JSON.parse(storedCart) as unknown;

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems
      .filter((item): item is CartItem => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const cartItem = item as Partial<CartItem>;

        return (
          typeof cartItem._id === "string" &&
          typeof cartItem.name === "string" &&
          typeof cartItem.price === "number" &&
          Number.isFinite(cartItem.price) &&
          typeof cartItem.quantity === "number" &&
          Number.isInteger(cartItem.quantity) &&
          cartItem.quantity > 0
        );
      })
      .map((item) => {
        const normalizedProduct = normalizeCartProduct(item);

        return {
          ...item,
          ...normalizedProduct,
          quantity: item.quantity,
          observation: item.observation ?? "",
        };
      });
  } catch (error) {
    console.error("[CartContext] Erro ao recuperar a sacola:", error);

    return [];
  }
}

function saveCartItems(items: CartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  } catch (error) {
    console.error("[CartContext] Erro ao salvar a sacola:", error);
  }
}

export function CartProvider({ children }: CartProviderProps) {
  const { store, isOpen, isLoading: isLoadingStore } = useStoreStatus();

  const [isCartOpen, setIsCartOpen] = useState(false);

  const storedCart = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerSnapshot,
  );

  const items = useMemo(() => {
    return parseCartItems(storedCart);
  }, [storedCart]);

  const cartBlockedMessage = useMemo(() => {
    if (isLoadingStore) {
      return CHECKING_STORE_MESSAGE;
    }

    if (!isOpen) {
      return store?.closedMessage || DEFAULT_CLOSED_MESSAGE;
    }

    return "";
  }, [isLoadingStore, isOpen, store?.closedMessage]);

  const canAddProducts = !isLoadingStore && isOpen;

  const getStoreBlockResult = useCallback((): CartMutationResult | null => {
    if (isLoadingStore) {
      console.warn(
        "[CartContext] Operação bloqueada: status da loja ainda está sendo consultado.",
      );

      return {
        success: false,
        message: CHECKING_STORE_MESSAGE,
      };
    }

    if (!isOpen) {
      console.warn("[CartContext] Operação bloqueada: a loja está fechada.", {
        closedMessage: store?.closedMessage,
      });

      return {
        success: false,
        message: store?.closedMessage || DEFAULT_CLOSED_MESSAGE,
      };
    }

    return null;
  }, [isLoadingStore, isOpen, store?.closedMessage]);

  const addToCart = useCallback(
    (product: CartProduct, quantity = 1): CartMutationResult => {
      const storeBlock = getStoreBlockResult();

      if (storeBlock) {
        return storeBlock;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        console.warn(
          "[CartContext] Quantidade inválida ao adicionar produto:",
          {
            productId: product._id,
            quantity,
          },
        );

        return {
          success: false,
          message: "Informe uma quantidade válida.",
        };
      }

      const normalizedProduct = normalizeCartProduct(product);

      const productAlreadyExists = items.find(
        (item) => item._id === normalizedProduct._id,
      );

      if (productAlreadyExists) {
        const updatedItems = items.map((item) =>
          item._id === normalizedProduct._id
            ? {
                ...item,
                ...normalizedProduct,
                quantity: item.quantity + quantity,
                observation: item.observation ?? "",
              }
            : item,
        );

        saveCartItems(updatedItems);

        console.log("[CartContext] Quantidade do produto atualizada:", {
          productId: normalizedProduct._id,
          quantityAdded: quantity,
        });

        return {
          success: true,
          message: "Quantidade atualizada na sacola.",
        };
      }

      const updatedItems: CartItem[] = [
        ...items,
        {
          ...normalizedProduct,
          quantity,
          observation: "",
        },
      ];

      saveCartItems(updatedItems);

      console.log("[CartContext] Produto adicionado à sacola:", {
        productId: normalizedProduct._id,
        productName: normalizedProduct.name,
        quantity,
      });

      return {
        success: true,
        message: "Produto adicionado à sacola.",
      };
    },
    [items, getStoreBlockResult],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      const updatedItems = items.filter((item) => item._id !== productId);

      saveCartItems(updatedItems);
    },
    [items],
  );

  const increaseQuantity = useCallback(
    (productId: string): CartMutationResult => {
      const storeBlock = getStoreBlockResult();

      if (storeBlock) {
        return storeBlock;
      }

      const productExists = items.some((item) => item._id === productId);

      if (!productExists) {
        return {
          success: false,
          message: "Produto não encontrado na sacola.",
        };
      }

      const updatedItems = items.map((item) =>
        item._id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item,
      );

      saveCartItems(updatedItems);

      return {
        success: true,
        message: "Quantidade aumentada.",
      };
    },
    [items, getStoreBlockResult],
  );

  const decreaseQuantity = useCallback(
    (productId: string) => {
      const updatedItems = items
        .map((item) =>
          item._id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item,
        )
        .filter((item) => item.quantity > 0);

      saveCartItems(updatedItems);
    },
    [items],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number): CartMutationResult => {
      const currentItem = items.find((item) => item._id === productId);

      if (!currentItem) {
        return {
          success: false,
          message: "Produto não encontrado na sacola.",
        };
      }

      /*
       * Quantidade zero ou negativa continua removendo
       * o item, mesmo com a loja fechada.
       */
      if (!Number.isInteger(quantity) || quantity <= 0) {
        const updatedItems = items.filter((item) => item._id !== productId);

        saveCartItems(updatedItems);

        return {
          success: true,
          message: "Produto removido da sacola.",
        };
      }

      /*
       * Se a quantidade nova for maior, trata como
       * adição e exige que a loja esteja aberta.
       */
      if (quantity > currentItem.quantity) {
        const storeBlock = getStoreBlockResult();

        if (storeBlock) {
          return storeBlock;
        }
      }

      const updatedItems = items.map((item) =>
        item._id === productId
          ? {
              ...item,
              quantity,
            }
          : item,
      );

      saveCartItems(updatedItems);

      return {
        success: true,
        message: "Quantidade atualizada.",
      };
    },
    [items, getStoreBlockResult],
  );

  const updateObservation = useCallback(
    (productId: string, observation: string) => {
      const updatedItems = items.map((item) =>
        item._id === productId
          ? {
              ...item,
              observation: observation.slice(0, 300),
            }
          : item,
      );

      saveCartItems(updatedItems);
    },
    [items],
  );

  const clearCart = useCallback(() => {
    saveCartItems([]);
  }, []);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const toggleCart = useCallback(() => {
    setIsCartOpen((currentValue) => !currentValue);
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const unitPrice = getValidProductPrice(item);

      return total + unitPrice * item.quantity;
    }, 0);
  }, [items]);

  const totalItems = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const value = useMemo<CartContextData>(
    () => ({
      items,
      totalItems,
      subtotal,
      totalPrice: subtotal,
      isCartOpen,
      canAddProducts,
      cartBlockedMessage,
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      updateQuantity,
      updateObservation,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    }),
    [
      items,
      totalItems,
      subtotal,
      isCartOpen,
      canAddProducts,
      cartBlockedMessage,
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      updateQuantity,
      updateObservation,
      clearCart,
      openCart,
      closeCart,
      toggleCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
