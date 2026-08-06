"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArchiveBox, Copy, DotsThreeVertical, Eye, Pause, PencilSimple, Play, Trash, XCircle } from "phosphor-react";

export type JobAction = "view" | "edit" | "duplicate" | "publish" | "pause" | "close" | "archive" | "delete";

interface JobActionsMenuProps {
  jobTitle: string;
  status?: string;
  canManage: boolean;
  onAction: (action: JobAction) => void;
}

const itemClassName = "flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none data-[highlighted]:bg-white/[0.07] data-[highlighted]:text-white";

export function JobActionsMenu({ jobTitle, status = "active", canManage, onAction }: JobActionsMenuProps) {
  const canPublish = status !== "active";
  const canPause = status === "active";
  const canClose = status !== "closed" && status !== "archived";
  const canArchive = status !== "archived";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={`Actions for ${jobTitle}`} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-gray-400 hover:bg-white/[0.06] hover:text-white">
          <DotsThreeVertical size={23} weight="bold" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-[80] min-w-52 rounded-xl border border-white/[0.1] bg-[#17191f] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.48)]">
          <DropdownMenu.Item onSelect={() => onAction("view")} className={itemClassName}><Eye size={17} />View job</DropdownMenu.Item>
          {canManage && <DropdownMenu.Item onSelect={() => onAction("edit")} className={itemClassName}><PencilSimple size={17} />Edit job</DropdownMenu.Item>}
          {canManage && <DropdownMenu.Item onSelect={() => onAction("duplicate")} className={itemClassName}><Copy size={17} />Duplicate</DropdownMenu.Item>}
          {canManage && <DropdownMenu.Separator className="my-1 h-px bg-white/[0.08]" />}
          {canManage && canPublish && <DropdownMenu.Item onSelect={() => onAction("publish")} className={itemClassName}><Play size={17} />Publish job</DropdownMenu.Item>}
          {canManage && canPause && <DropdownMenu.Item onSelect={() => onAction("pause")} className={itemClassName}><Pause size={17} />Pause applications</DropdownMenu.Item>}
          {canManage && canClose && <DropdownMenu.Item onSelect={() => onAction("close")} className={itemClassName}><XCircle size={17} />Close job</DropdownMenu.Item>}
          {canManage && canArchive && <DropdownMenu.Item onSelect={() => onAction("archive")} className={itemClassName}><ArchiveBox size={17} />Archive</DropdownMenu.Item>}
          {canManage && <DropdownMenu.Separator className="my-1 h-px bg-white/[0.08]" />}
          {canManage && <DropdownMenu.Item onSelect={() => onAction("delete")} className={`${itemClassName} text-red-400 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-300`}><Trash size={17} />Delete permanently</DropdownMenu.Item>}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
