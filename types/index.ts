export interface Category {
  _id: string;
  name: string;
  normalizedName?: string;
  active?: boolean;
  position?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  url: string;
  publicId: string;
}

export interface Product {
  _id: string;
  name: string;
  normalizedName: string;
  description: string;
  price: number;
  promotionalPrice?: number | null;

  categoryId: string;
  categoryName: string;

  image: ProductImage;

  active: boolean;
  featured: boolean;
  position: number;

  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
