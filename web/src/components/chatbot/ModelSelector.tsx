"use client";

import React from "react";

export type ModelProvider = "gemini" | "claude" | "sk_ax" | "openai";

interface ModelSelectorProps {
  selected: ModelProvider;
  onChange: (provider: ModelProvider) => void;
}

export default function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  return (
    <div className="chatbot-model-selector">
      <label htmlFor="model-select" className="chatbot-model-label">AI 모델</label>
      <select
        id="model-select"
        value={selected}
        onChange={(e) => onChange(e.target.value as ModelProvider)}
        className="chatbot-model-select"
      >
        <option value="gemini">Gemini</option>
        <option value="claude">Claude</option>
        <option value="sk_ax">SK A.X (설정 필요)</option>
        <option value="openai">OpenAI</option>
      </select>
    </div>
  );
}
