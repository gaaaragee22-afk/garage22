import { InferSchemaType, Model, Schema, model, models } from "mongoose";

const orderItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      required: [true, "O ID do produto é obrigatório."],
      ref: "Product",
    },

    name: {
      type: String,
      required: [true, "O nome do produto é obrigatório."],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      required: [true, "O preço do produto é obrigatório."],
      min: [0, "O preço não pode ser negativo."],
    },

    quantity: {
      type: Number,
      required: [true, "A quantidade é obrigatória."],
      min: [1, "A quantidade mínima é 1."],
      validate: {
        validator: Number.isInteger,
        message: "A quantidade precisa ser um número inteiro.",
      },
    },

    total: {
      type: Number,
      required: [true, "O total do produto é obrigatório."],
      min: [0, "O total não pode ser negativo."],
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    customer: {
      phone: {
        type: String,
        required: [true, "O telefone é obrigatório."],
        trim: true,
      },
    },

    address: {
      cep: {
        type: String,
        required: [true, "O CEP é obrigatório."],
        trim: true,
      },

      street: {
        type: String,
        required: [true, "A rua é obrigatória."],
        trim: true,
      },

      neighborhood: {
        type: String,
        required: [true, "O bairro é obrigatório."],
        trim: true,
      },

      number: {
        type: String,
        required: [true, "O número é obrigatório."],
        trim: true,
      },

      complement: {
        type: String,
        trim: true,
        default: "",
      },

      reference: {
        type: String,
        trim: true,
        default: "",
      },

      city: {
        type: String,
        required: [true, "A cidade é obrigatória."],
        enum: {
          values: ["Cuité", "Nova Floresta", "Jaçanã"],
          message: "A cidade informada não é atendida.",
        },
      },

      state: {
        type: String,
        required: [true, "O estado é obrigatório."],
        enum: {
          values: ["PB", "RN"],
          message: "O estado informado não é permitido.",
        },
      },
    },

    payment: {
      method: {
        type: String,
        required: [true, "A forma de pagamento é obrigatória."],
        enum: {
          values: ["cash", "pix", "card"],
          message: "Forma de pagamento inválida.",
        },
      },

      changeFor: {
        type: Number,
        default: null,
        min: [0, "O valor do troco não pode ser negativo."],
      },

      cardType: {
        type: String,
        default: null,
        enum: {
          values: ["debit", "credit", null],
          message: "Tipo de cartão inválido.",
        },
      },

      cardBrand: {
        type: String,
        default: null,
        enum: {
          values: [
            "visa",
            "mastercard",
            "elo",
            "hipercard",
            "amex",
            "other",
            null,
          ],
          message: "Bandeira do cartão inválida.",
        },
      },
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: InferSchemaType<typeof orderItemSchema>[]) =>
          items.length > 0,

        message: "O pedido precisa ter pelo menos um produto.",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: [0, "O subtotal não pode ser negativo."],
    },

    deliveryFee: {
      type: Number,
      required: true,
      min: [0, "A taxa de entrega não pode ser negativa."],
    },

    total: {
      type: Number,
      required: true,
      min: [0, "O total não pode ser negativo."],
    },

    status: {
      type: String,
      enum: {
        values: [
          "pending",
          "confirmed",
          "preparing",
          "out_for_delivery",
          "delivered",
          "canceled",
        ],
        message: "Status do pedido inválido.",
      },
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

orderSchema.index({
  createdAt: -1,
});

export type OrderDocument = InferSchemaType<typeof orderSchema>;

const Order =
  (models.Order as Model<OrderDocument>) ||
  model<OrderDocument>("Order", orderSchema);

export default Order;
