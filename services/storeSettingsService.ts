import { connectDatabase } from "@/lib/database";
import StoreSettings from "@/models/StoreSettings";

export interface StoreStatus {
  isOpen: boolean;
  closedMessage: string;
  lastStatusChangeAt: string;
  updatedAt: string;
}

export async function getStoreSettings() {
  await connectDatabase();

  const settings = await StoreSettings.findOneAndUpdate(
    {
      identifier: "main-store",
    },
    {
      $setOnInsert: {
        identifier: "main-store",
        isOpen: true,
        closedMessage:
          "No momento, nossa loja está fechada para novos pedidos.",
        lastStatusChangeAt: new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  if (!settings) {
    throw new Error("Não foi possível carregar as configurações da loja.");
  }

  return settings;
}

export async function getPublicStoreStatus(): Promise<StoreStatus> {
  const settings = await getStoreSettings();

  return {
    isOpen: settings.isOpen,
    closedMessage: settings.closedMessage,
    lastStatusChangeAt: settings.lastStatusChangeAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function changeStoreStatus({
  isOpen,
  closedMessage,
  changedBy,
}: {
  isOpen: boolean;
  closedMessage?: string;
  changedBy?: string;
}) {
  await connectDatabase();

  const updateData: {
    isOpen: boolean;
    lastStatusChangeAt: Date;
    changedBy?: string;
    closedMessage?: string;
  } = {
    isOpen,
    lastStatusChangeAt: new Date(),
  };

  if (changedBy) {
    updateData.changedBy = changedBy;
  }

  if (typeof closedMessage === "string" && closedMessage.trim()) {
    updateData.closedMessage = closedMessage.trim();
  }

  const settings = await StoreSettings.findOneAndUpdate(
    {
      identifier: "main-store",
    },
    {
      $set: updateData,
      $setOnInsert: {
        identifier: "main-store",
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  if (!settings) {
    throw new Error("Não foi possível atualizar o funcionamento da loja.");
  }

  return {
    isOpen: settings.isOpen,
    closedMessage: settings.closedMessage,
    lastStatusChangeAt: settings.lastStatusChangeAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function ensureStoreIsOpen(): Promise<void> {
  const settings = await getStoreSettings();

  if (!settings.isOpen) {
    throw new StoreClosedError(settings.closedMessage);
  }
}

export class StoreClosedError extends Error {
  public readonly statusCode = 403;
  public readonly code = "STORE_CLOSED";

  constructor(message: string) {
    super(message);
    this.name = "StoreClosedError";
  }
}
