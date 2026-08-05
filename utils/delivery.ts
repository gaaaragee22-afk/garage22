import type {
  AllowedCity,
  AllowedState,
  ViaCepResponse,
} from "@/types/checkout";

interface DeliveryLocation {
  city: AllowedCity;
  state: AllowedState;
  fee: number;
}

export const deliveryLocations: DeliveryLocation[] = [
  {
    city: "Cuité",
    state: "PB",
    fee: 2,
  },
  {
    city: "Nova Floresta",
    state: "PB",
    fee: 10,
  },
  {
    city: "Jaçanã",
    state: "RN",
    fee: 20,
  },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function findAllowedLocation(
  city: string,
  state: string,
): DeliveryLocation | null {
  const normalizedCity = normalizeText(city);
  const normalizedState = state.trim().toUpperCase();

  return (
    deliveryLocations.find(
      (location) =>
        normalizeText(location.city) === normalizedCity &&
        location.state === normalizedState,
    ) ?? null
  );
}

export function validateDeliveryCity(
  address: ViaCepResponse,
): DeliveryLocation | null {
  return findAllowedLocation(address.localidade, address.uf);
}

export function getDeliveryFee(city: string, state: string): number {
  const location = findAllowedLocation(city, state);

  return location?.fee ?? 0;
}
