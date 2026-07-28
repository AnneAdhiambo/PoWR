"use client";

import React from "react";
import { Warning, XCircle } from "phosphor-react";
import { Button } from "./Button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./Dialog";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
}) => {
  const variantStyles = {
    danger: {
      icon: "text-red-500",
      button: "danger" as const,
    },
    warning: {
      icon: "text-yellow-500",
      button: "primary" as const,
    },
    info: {
      icon: "text-[#FF5500]",
      button: "primary" as const,
    },
  };

  const styles = variantStyles[variant];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" onEscapeKeyDown={onClose}>
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {variant === "danger" ? (
              <XCircle className="w-6 h-6" weight="fill" />
            ) : (
              <Warning className="w-6 h-6" weight="fill" />
            )}
          </div>
          <div className="flex-1">
            <DialogTitle className="mb-2 text-lg font-semibold text-white">{title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-400">{message}</DialogDescription>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm">{cancelText}</Button>
          </DialogClose>
          <Button
            type="button"
            variant={styles.button}
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

