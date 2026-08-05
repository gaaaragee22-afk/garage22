import { HydratedDocument, Model, Schema, model, models } from "mongoose";

export interface CategoryType {
  name: string;
  normalizedName: string;
  description: string;
  position: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<CategoryType>;

const categorySchema = new Schema<CategoryType, Model<CategoryType>>(
  {
    name: {
      type: String,
      required: [true, "O nome da categoria é obrigatório."],
      trim: true,
      minlength: [2, "O nome deve possuir pelo menos 2 caracteres."],
      maxlength: [100, "O nome deve possuir no máximo 100 caracteres."],
    },

    normalizedName: {
      type: String,
      required: [true, "O nome normalizado é obrigatório."],
      trim: true,
      lowercase: true,
      unique: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "A descrição deve possuir no máximo 500 caracteres."],
    },

    position: {
      type: Number,
      default: 0,
      min: [0, "A posição não pode ser negativa."],
      validate: {
        validator(value: number) {
          return Number.isInteger(value);
        },
        message: "A posição deve ser um número inteiro.",
      },
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

categorySchema.index({
  position: 1,
  createdAt: -1,
});

const Category =
  (models.Category as Model<CategoryType>) ||
  model<CategoryType>("Category", categorySchema);

export default Category;
