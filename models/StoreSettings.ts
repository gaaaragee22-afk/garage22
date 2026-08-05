import { InferSchemaType, Model, Schema, model, models } from "mongoose";

const storeSettingsSchema = new Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      default: "main-store",
      trim: true,
    },

    isOpen: {
      type: Boolean,
      required: true,
      default: true,
    },

    closedMessage: {
      type: String,
      required: true,
      default: "No momento, nossa loja está fechada para novos pedidos.",
      trim: true,
      maxlength: 300,
    },

    changedBy: {
      type: String,
      default: null,
      trim: true,
    },

    lastStatusChangeAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type StoreSettingsDocument = InferSchemaType<typeof storeSettingsSchema>;

const StoreSettings =
  (models.StoreSettings as Model<StoreSettingsDocument>) ||
  model<StoreSettingsDocument>("StoreSettings", storeSettingsSchema);

export default StoreSettings;
