"use client";

import { Check, MapPin, Phone, ReceiptText } from "lucide-react";

import type { CheckoutStep } from "@/types/checkout";

interface CheckoutStepsProps {
  currentStep: CheckoutStep;
}

const steps = [
  {
    id: "phone" as const,
    label: "Celular",
    icon: Phone,
  },
  {
    id: "cep" as const,
    label: "CEP",
    icon: MapPin,
  },
  {
    id: "address" as const,
    label: "Endereço",
    icon: MapPin,
  },
  {
    id: "review" as const,
    label: "Revisão",
    icon: ReceiptText,
  },
];

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="mx-auto flex min-w-[520px] max-w-3xl items-start justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;

          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div
              key={step.id}
              className="relative flex flex-1 flex-col items-center"
            >
              {index !== 0 && (
                <div
                  className={`absolute right-1/2 top-5 h-1 w-full transition-colors duration-300 ${
                    index <= currentIndex ? "bg-[#7f3c19]" : "bg-zinc-200"
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isCompleted || isCurrent
                    ? "border-[#7f3c19] bg-[#7f3c19] text-white shadow-[0_6px_18px_rgba(127,60,25,0.22)]"
                    : "border-zinc-300 bg-white text-zinc-400"
                }`}
              >
                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
              </div>

              <span
                className={`mt-2 text-xs font-semibold transition-colors sm:text-sm ${
                  isCurrent
                    ? "text-[#7f3c19]"
                    : isCompleted
                      ? "text-[#7f5417]"
                      : "text-zinc-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
