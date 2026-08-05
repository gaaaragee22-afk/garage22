import {
  model,
  models,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const productImageSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    width: {
      type: Number,
      required: true,
      min: 1,
    },

    height: {
      type: Number,
      required: true,
      min: 1,
    },

    format: {
      type: String,
      required: true,
      trim: true,
    },

    bytes: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "O nome do produto é obrigatório."],
      trim: true,
      minlength: [2, "O nome deve possuir pelo menos 2 caracteres."],
      maxlength: [120, "O nome deve possuir no máximo 120 caracteres."],
    },

    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      required: [true, "A descrição do produto é obrigatória."],
      trim: true,
      minlength: [10, "A descrição deve possuir pelo menos 10 caracteres."],
      maxlength: [2000, "A descrição deve possuir no máximo 2000 caracteres."],
    },

    price: {
      type: Number,
      required: [true, "O preço do produto é obrigatório."],
      min: [0.01, "O preço deve ser maior que zero."],
    },

    promotionalPrice: {
      type: Number,
      default: null,
      min: [0.01, "O preço promocional deve ser maior que zero."],
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "A categoria é obrigatória."],
      index: true,
    },

    image: {
      type: productImageSchema,
      required: [true, "A imagem do produto é obrigatória."],
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    position: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

productSchema.index({
  categoryId: 1,
  position: 1,
  createdAt: -1,
});

export type ProductDocument = InferSchemaType<typeof productSchema>;

const Product =
  (models.Product as Model<ProductDocument>) ||
  model<ProductDocument>("Product", productSchema);

export default Product;
