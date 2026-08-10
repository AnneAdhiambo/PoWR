"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CaretDown, Check } from "phosphor-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  ariaLabel,
  placeholder = "Select an option",
  disabled = false,
  className = "",
}: SelectProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={ariaLabel}
          className={`powr-control flex w-full cursor-pointer items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
          <span className={selected ? "text-white" : "text-gray-600"}>{selected?.label || placeholder}</span>
          <CaretDown size={15} className="shrink-0 text-gray-500" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[80] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-xl border border-white/[0.1] bg-[#17191f] p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.48)]"
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className="group flex cursor-pointer select-none items-start gap-3 rounded-lg px-3 py-2.5 outline-none data-[highlighted]:bg-white/[0.07] data-[state=checked]:bg-white/[0.045]"
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-gray-500 group-data-[state=checked]:text-white">
                  <DropdownMenu.ItemIndicator><Check size={13} weight="bold" /></DropdownMenu.ItemIndicator>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-gray-200">{option.label}</span>
                  {option.description && <span className="mt-0.5 block text-xs leading-5 text-gray-500">{option.description}</span>}
                </span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
