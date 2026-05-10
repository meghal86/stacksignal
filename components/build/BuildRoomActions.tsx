"use client";

import { Button } from "@/components/ui/Button";

export function BuildRoomActions() {
  return (
    <Button 
      size="sm" 
      className="bg-[#1A1A1A] text-white hover:bg-[#FF4800] transition-colors rounded-none px-6 h-10 uppercase font-heading text-xs tracking-widest"
      onClick={() => window.print()}
    >
      Export Assets
    </Button>
  );
}
