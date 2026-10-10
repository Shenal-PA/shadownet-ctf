import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full mt-auto bg-[#080A0D] border-t border-[#232B36] py-4 text-xs font-mono text-[#8B949E]">
      <div className="w-full app-container flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="text-[#FF6B00] font-bold">SHADOWNET COLLECTIVE</span>
          <span className="text-[#232B36]">|</span>
          <span className="text-[#8B949E]">NexaCorp Infiltration Range</span>
          <span className="text-[#FF9F43] font-semibold">v2.4</span>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-[#10B981]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>Target Uplink Online</span>
          </span>
          <span className="text-[#232B36]">|</span>
          <span className="text-[#8B949E]">Encrypted Mesh Protocol</span>
        </div>
      </div>
    </footer>
  );
}
