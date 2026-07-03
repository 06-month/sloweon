"use client";

import React from "react";

export type ModelProvider = "gemini" | "claude" | "sk_ax" | "openai";

interface ModelSelectorProps {
  selected: ModelProvider;
  onChange: (provider: ModelProvider) => void;
}

export default function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center space-x-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg px-2 py-1 flex-shrink-0">
      <label htmlFor="model-select" className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">AI Model:</label>
      <select
        id="model-select"
        value={selected}
        onChange={(e) => onChange(e.target.value as ModelProvider)}
        className="bg-transparent text-white text-[11px] font-semibold focus:outline-none cursor-pointer pr-1"
      >
        <option value="gemini" className="bg-zinc-950 text-white">Gemini</option>
        <option value="claude" className="bg-zinc-950 text-white">Claude</option>
        <option value="sk_ax" className="bg-zinc-950 text-white">SK A.X (설정 필요)</option>
        <option value="openai" className="bg-zinc-950 text-white">OpenAI</option>
      </select>
    </div>
  );
}
