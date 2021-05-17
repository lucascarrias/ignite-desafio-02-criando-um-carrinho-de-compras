import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find((cartProduct) => cartProduct.id === productId);

      if (product) {
        updateProductAmount({ productId, amount: product.amount + 1 });
      } else {
        const stockItem = await api.get<Stock>(`/stock/${productId}`).then(response => response.data);
        const productData = await api.get<Product>(`/products/${productId}`).then(response => response.data);
        
        if (stockItem.amount > 0) {
          productData.amount = 1;
          setCart([...cart, productData]);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart, productData]));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((cartProduct) => cartProduct.id === productId);

      if (product) {
        const updatedCart = cart.filter(item => item.id !== product.id);
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw new Error();
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const productItem = cart.find(
        (cartProduct) => cartProduct.id === productId
      );
      const stockItem = await api.get<Stock>(`/stock/${productId}`).then(response => response.data)
      
      if (!productItem || !stockItem) {
        throw new Error();
      }

      if (amount <= stockItem.amount) {
        const updatedCart = cart.map((cartProduct) => {
          if (cartProduct.id === productId) {
            cartProduct.amount = amount;
          }
          return cartProduct;
        })
      
        setCart(updatedCart);
          
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
