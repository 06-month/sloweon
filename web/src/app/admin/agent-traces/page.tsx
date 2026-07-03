"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface AgentTrace {
  traceId: string;
  timestamp: string;
  userMessage: string;
  selectedModelProvider: string;
  agentModelMode: string;
  classificationResult?: {
    category: string;
    confidence: number;
    reason: string;
    nextAgent: string;
    requiredTools?: string[];
    requiredRagSources?: string[];
    clarificationQuestion?: string | null;
  };
  calledTools?: Array<{
    toolName: string;
    inputSummary: string;
    outputSummary: string;
    success: boolean;
  }>;
  ragSources?: Array<{
    sourceType: string;
    sourceId: string;
    title: string;
    score: number;
    contentPreview: string;
    usedByAgent: string;
  }>;
  finalAnswer: string;
  guardrailActions?: {
    blockedOrderAction: boolean;
    blockedRefundAction: boolean;
    fallbackUsed: boolean;
  };
  latency: number;
  error?: string | null;
}

export default function AgentTracesPage() {
  const [traces, setTraces] = useState<AgentTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<AgentTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  const fetchTraces = async () => {
    try {
      const response = await fetch("/api/admin/traces");
      
      if (response.status === 403) {
        const errData = await response.json();
        setAccessDeniedError(errData.error || "Access Denied");
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setTraces(data.traces || []);
        if (data.traces && data.traces.length > 0) {
          setSelectedTrace(data.traces[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch traces", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  // 403 Forbidden 시의 가드레일 UI 안전 렌더링
  if (accessDeniedError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-950/40 border border-red-900 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Restrained</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            보안 정책에 의해 운영 환경(Production)에서의 에이전트 트레이스 모니터 콘솔 접근이 차단되었습니다.
            <span className="block mt-2 font-mono text-xs text-red-400 bg-zinc-950 p-2.5 rounded border border-zinc-850">
              {accessDeniedError}
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <Link 
              href="/"
              className="w-full py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-all block"
            >
              Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* Gnb/Header */}
      <header className="max-w-7xl mx-auto flex items-center justify-between border-b border-zinc-800 pb-6 mb-8">
        <div>
          <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
            Internal Devtool
          </span>
          <h1 className="text-2xl font-bold text-white mt-1.5 tracking-tight flex items-center gap-2">
            SLOWEON Agent Trace Console
            <span className="text-zinc-500 font-normal text-sm">v3.0.0 (MVP3 RAG)</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchTraces}
            className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 active:scale-95 transition-all"
          >
            🔄 Refresh List
          </button>
          <Link 
            href="/"
            className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-200 transition-all"
          >
            ← Back to Storefront
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column - Trace List */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Trace History ({traces.length})</h2>
          
          {loading ? (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-8 text-center text-zinc-500 text-sm">
              Loading traces...
            </div>
          ) : traces.length === 0 ? (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-8 text-center text-zinc-500 text-sm">
              No traces captured yet. Send a message to the chatbot first!
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-2">
              {traces.map((trace) => {
                const isSelected = selectedTrace?.traceId === trace.traceId;
                const isRefund = trace.classificationResult?.category === "refund";
                
                return (
                  <button
                    key={trace.traceId}
                    onClick={() => setSelectedTrace(trace)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? "bg-zinc-900 border-zinc-600 shadow-lg text-white" 
                        : "bg-zinc-900/30 border-zinc-900 hover:border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-mono text-zinc-500">{trace.traceId}</span>
                      <span className="text-zinc-500">{trace.timestamp}</span>
                    </div>
                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-zinc-300"}`}>
                      {trace.userMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-[10px]">
                      <span className={`px-2 py-0.5 rounded font-semibold uppercase ${
                        isRefund ? "bg-red-950 border border-red-900 text-red-400" : "bg-zinc-800 text-zinc-300"
                      }`}>
                        {trace.classificationResult?.category || "Unknown"}
                      </span>
                      <span className="text-zinc-500">
                        {trace.selectedModelProvider} / {trace.latency}ms
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Security Notice Card */}
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 mt-2">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              ⚠️ Security Notice
            </h4>
            <p className="text-[11px] text-amber-500/80 leading-relaxed">
              API Keys, user raw telephone numbers, full emails, and credit cards are strictly masked by the `maskSensitiveData` utility before storing. This debug console is accessible only in development mode or via authenticated administrator guards.
            </p>
          </div>
        </section>

        {/* Right column - Detail Trace Timeline */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Trace Detail Flow</h2>

          {selectedTrace ? (
            <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-6 flex flex-col gap-6 backdrop-blur-md">
              
              {/* Trace Summary */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/60 pb-5">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1 bg-zinc-800 rounded font-mono text-xs text-zinc-300">
                    ID: {selectedTrace.traceId}
                  </div>
                  <span className="text-xs text-zinc-500">{selectedTrace.timestamp}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <div>Model Mode: <strong className="text-white">{selectedTrace.agentModelMode}</strong></div>
                  <div>LLM: <strong className="text-white">{selectedTrace.selectedModelProvider.toUpperCase()}</strong></div>
                  <div>Latency: <strong className="text-emerald-400">{selectedTrace.latency}ms</strong></div>
                </div>
              </div>

              {/* TIMELINE */}
              <div className="flex flex-col gap-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                
                {/* 1. Input Message */}
                <div className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-blue-950 border border-blue-900 text-blue-400 text-xs font-bold flex items-center justify-center z-10">
                    IN
                  </div>
                  <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">User Message</span>
                    <p className="text-sm text-zinc-200 font-semibold mt-1 font-mono">
                      "{selectedTrace.userMessage}"
                    </p>
                  </div>
                </div>

                {/* 2. Classification Agent */}
                {selectedTrace.classificationResult && (
                  <div className="flex gap-4 relative">
                    <div className="w-6 h-6 rounded-full bg-purple-950 border border-purple-900 text-purple-400 text-xs font-bold flex items-center justify-center z-10">
                      CL
                    </div>
                    <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Classification Agent Decision</span>
                        <span className="text-xs text-emerald-400 font-bold">
                          Confidence: {(selectedTrace.classificationResult.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <span className="text-[10px] text-zinc-500">Detected Category</span>
                          <p className="text-xs text-zinc-200 font-semibold uppercase mt-0.5">
                            {selectedTrace.classificationResult.category}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500">Next Agent Target</span>
                          <p className="text-xs text-zinc-200 font-semibold mt-0.5 font-mono">
                            {selectedTrace.classificationResult.nextAgent}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="text-[10px] text-zinc-500">Classification Reason</span>
                        <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                          {selectedTrace.classificationResult.reason}
                        </p>
                      </div>
                      {selectedTrace.classificationResult.clarificationQuestion && (
                        <div className="mt-3 bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5 text-xs text-amber-300">
                          <strong>Clarification Needed:</strong> "{selectedTrace.classificationResult.clarificationQuestion}"
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. RAG Retrieval */}
                <div className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-900 text-cyan-400 text-xs font-bold flex items-center justify-center z-10">
                    RG
                  </div>
                  <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">RAG Retrieval</span>
                    {selectedTrace.ragSources && selectedTrace.ragSources.length > 0 ? (
                      <div className="flex flex-col gap-1.5 mt-3">
                        {selectedTrace.ragSources.map((rag, i) => (
                          <div key={i} className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80 text-xs">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="bg-zinc-800 text-[10px] text-zinc-400 px-1.5 py-0.5 rounded shrink-0">
                                  {rag.sourceType}
                                </span>
                                <span className="text-zinc-200 font-semibold truncate">{rag.title}</span>
                              </div>
                              <span className="text-emerald-400 font-mono text-[10px] shrink-0">
                                {(rag.score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-zinc-400 text-[11px] leading-relaxed">{rag.contentPreview}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-500 font-mono">
                              <span>id: {rag.sourceId}</span>
                              <span>agent: {rag.usedByAgent}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 mt-2">No RAG chunks retrieved.</p>
                    )}
                  </div>
                </div>

                {/* 4. Tool Execution */}
                <div className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-900 text-emerald-400 text-xs font-bold flex items-center justify-center z-10">
                    TL
                  </div>
                  <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Tool Execution</span>
                    
                    {selectedTrace.calledTools && selectedTrace.calledTools.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {selectedTrace.calledTools.map((tool, i) => (
                          <div key={i} className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 text-xs flex flex-col gap-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-zinc-100 font-bold font-mono">
                                {tool.toolName}()
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                tool.success ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
                              }`}>
                                {tool.success ? "SUCCESS" : "FAILURE"}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              <strong>Input:</strong> <code className="bg-zinc-950/60 px-1 py-0.5 rounded font-mono text-zinc-300">{tool.inputSummary}</code>
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              <strong>Output:</strong> <code className="bg-zinc-950/60 px-1 py-0.5 rounded font-mono text-zinc-300">{tool.outputSummary}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500">No tool executions requested.</p>
                    )}
                  </div>
                </div>

                {/* 5. Guardrail Status */}
                {selectedTrace.guardrailActions && (
                  <div className="flex gap-4 relative">
                    <div className="w-6 h-6 rounded-full bg-red-950 border border-red-900 text-red-400 text-xs font-bold flex items-center justify-center z-10">
                      GD
                    </div>
                    <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                      <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Guardrails Integrity Status</span>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            selectedTrace.guardrailActions.blockedRefundAction ? "bg-red-950 border border-red-800 text-red-400" : "bg-zinc-800 text-zinc-500"
                          }`}>
                            {selectedTrace.guardrailActions.blockedRefundAction ? "✓" : "✗"}
                          </span>
                          <span className={selectedTrace.guardrailActions.blockedRefundAction ? "text-zinc-200" : "text-zinc-500"}>
                            Blocked Refund Action
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            selectedTrace.guardrailActions.blockedOrderAction ? "bg-red-950 border border-red-800 text-red-400" : "bg-zinc-800 text-zinc-500"
                          }`}>
                            {selectedTrace.guardrailActions.blockedOrderAction ? "✓" : "✗"}
                          </span>
                          <span className={selectedTrace.guardrailActions.blockedOrderAction ? "text-zinc-200" : "text-zinc-500"}>
                            Blocked Order Action
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            selectedTrace.guardrailActions.fallbackUsed ? "bg-amber-950 border border-amber-800 text-amber-400" : "bg-zinc-800 text-zinc-500"
                          }`}>
                            {selectedTrace.guardrailActions.fallbackUsed ? "✓" : "✗"}
                          </span>
                          <span className={selectedTrace.guardrailActions.fallbackUsed ? "text-zinc-200" : "text-zinc-500"}>
                            Fallback Rules Triggered
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Final Answer */}
                <div className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-950 text-xs font-bold flex items-center justify-center z-10">
                    OUT
                  </div>
                  <div className="flex-1 bg-zinc-100 text-zinc-950 rounded-xl p-4">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Final Output Answer</span>
                    <p className="text-sm font-semibold leading-relaxed mt-1.5 whitespace-pre-line">
                      {selectedTrace.finalAnswer}
                    </p>
                  </div>
                </div>

              </div>

              {/* Error boundary logging */}
              {selectedTrace.error && (
                <div className="bg-red-950/20 border border-red-900/60 text-red-400 text-xs rounded-xl p-4 font-mono">
                  <strong>Orchestration Error Capture:</strong> {selectedTrace.error}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-zinc-900/20 border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-500 text-sm">
              Select a trace from the left panel to inspect the timeline execution flow.
            </div>
          )}
        </section>

      </main>

    </div>
  );
}
