"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface TraceRagSource {
  sourceType: string;
  sourceId: string;
  title: string;
  score: number;
  contentPreview: string;
  usedByAgent: string;
  reason?: string;
  productId?: string | null;
}

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
  ragSources?: TraceRagSource[];
  ragSourcesUsed?: TraceRagSource[];
  rejectedRagSources?: TraceRagSource[];
  lowScoreRagSources?: TraceRagSource[];
  productFactPacks?: Array<{
    productId: string;
    name: string;
    koreanName: string;
    priceKrw: number;
    category: string;
    color: string;
    material: string;
    fit: string;
    description: string;
    stockSummary: {
      inStock: boolean;
      totalStock: number;
      availableOptions: string[];
    };
    productUrl: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    inventory?: Array<{
      colorName: string;
      size: string;
      stock: number;
      status: string;
    }>;
    sizeSpecs: Array<{ size: string }>;
    modelFit?: {
      modelName: string;
      height: number;
      weight: number;
      wearingSize: string;
      fitComment: string;
    } | null;
    reviewFitSummary?: string | null;
    ragEvidenceTitles: string[];
    ragEvidencePreview: string[];
  }>;
  productCards?: Array<{
    productId: string;
    title: string;
    subtitle?: string;
    priceKrw?: number;
    imageUrl?: string;
    productUrl: string;
    badge?: string;
    stockStatus?: "available" | "out_of_stock" | "limited" | "unknown";
    ctaLabel?: string;
  }>;
  productCardsGenerated?: boolean;
  productCardsCount?: number;
  productCardProductIds?: string[];
  missingImageProductIds?: string[];
  cardRenderMode?: "mini_card" | "markdown_link_fallback";
  linkFallbackReason?: string | null;
  dbFactsUsed?: string[];
  groundingWarnings?: string[];
  answerUsedDbFacts?: boolean;
  answerUsedRag?: boolean;
  hallucinationGuardTriggered?: boolean;
  productSearchMeta?: {
    normalizedQuery: string;
    expandedQuery: string;
    productSearchFilters: Record<string, unknown>;
    toolResultsCount: number;
    ragResultsCount: number;
    rawRagResultsCount?: number;
    groupedRagResultsCount?: number;
    droppedLowScoreCount?: number;
    deduplicatedCount?: number;
    productGroupingCollapsedCount?: number;
    productCandidatesCount: number;
    searchProductsCalled: boolean;
  };
  finalAnswer: string;
  guardrailActions?: {
    blockedOrderAction: boolean;
    blockedRefundAction: boolean;
    fallbackUsed: boolean;
    fallbackReason?: string | null;
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
      const response = await fetch("/api/admin?action=traces");
      
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
            <span className="text-zinc-500 font-normal text-sm">v4.0.0 (Grounded RAG)</span>
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
                    {selectedTrace.productSearchMeta && (
                      <div className="mt-2 mb-3 p-2.5 bg-zinc-950/60 rounded-lg border border-zinc-800/80 text-[10px] font-mono text-zinc-400 space-y-1">
                        <div><span className="text-zinc-500">normalized:</span> {selectedTrace.productSearchMeta.normalizedQuery}</div>
                        <div><span className="text-zinc-500">expanded:</span> {selectedTrace.productSearchMeta.expandedQuery}</div>
                        <div><span className="text-zinc-500">searchProducts:</span> {selectedTrace.productSearchMeta.searchProductsCalled ? "yes" : "no"} | <span className="text-zinc-500">candidates:</span> {selectedTrace.productSearchMeta.productCandidatesCount} | <span className="text-zinc-500">rag:</span> {selectedTrace.productSearchMeta.ragResultsCount}</div>
                        <div>
                          <span className="text-zinc-500">raw:</span> {selectedTrace.productSearchMeta.rawRagResultsCount ?? "-"} |{" "}
                          <span className="text-zinc-500">grouped:</span> {selectedTrace.productSearchMeta.groupedRagResultsCount ?? "-"} |{" "}
                          <span className="text-zinc-500">lowScoreDrop:</span> {selectedTrace.productSearchMeta.droppedLowScoreCount ?? "-"} |{" "}
                          <span className="text-zinc-500">dedup:</span> {selectedTrace.productSearchMeta.deduplicatedCount ?? "-"} |{" "}
                          <span className="text-zinc-500">productCollapsed:</span> {selectedTrace.productSearchMeta.productGroupingCollapsedCount ?? "-"}
                        </div>
                      </div>
                    )}
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
                              {rag.productId && <span>product: {rag.productId}</span>}
                              <span>agent: {rag.usedByAgent}</span>
                              {rag.reason && <span>reason: {rag.reason}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 mt-2">No RAG chunks retrieved.</p>
                    )}
                    {selectedTrace.lowScoreRagSources && selectedTrace.lowScoreRagSources.length > 0 && (
                      <div className="mt-4 border-t border-zinc-800/80 pt-3">
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                          Low Score RAG Sources ({selectedTrace.lowScoreRagSources.length})
                        </span>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {selectedTrace.lowScoreRagSources.slice(0, 5).map((rag, i) => (
                            <div key={i} className="bg-amber-950/10 border border-amber-900/30 rounded-lg p-2 text-[11px] text-amber-200/80">
                              <div className="flex justify-between gap-2">
                                <span className="truncate">{rag.sourceType} · {rag.title}</span>
                                <span className="font-mono">{(rag.score * 100).toFixed(0)}%</span>
                              </div>
                              <div className="mt-1 font-mono text-[10px] text-amber-300/60">
                                {rag.sourceId}{rag.reason ? ` · ${rag.reason}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Evidence Grouping */}
                <div className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-sky-950 border border-sky-900 text-sky-400 text-xs font-bold flex items-center justify-center z-10">
                    EG
                  </div>
                  <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                    <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Evidence Grouping & Grounding</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <span className="text-[10px] text-zinc-500 uppercase">DB Facts Used</span>
                        <p className="mt-1 text-zinc-200 font-mono">{selectedTrace.dbFactsUsed?.length ?? 0}</p>
                      </div>
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <span className="text-[10px] text-zinc-500 uppercase">RAG Sources Used</span>
                        <p className="mt-1 text-zinc-200 font-mono">{selectedTrace.ragSourcesUsed?.length ?? 0}</p>
                      </div>
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <span className="text-[10px] text-zinc-500 uppercase">Rejected Sources</span>
                        <p className="mt-1 text-zinc-200 font-mono">{selectedTrace.rejectedRagSources?.length ?? 0}</p>
                      </div>
                    </div>

                    {selectedTrace.ragSourcesUsed && selectedTrace.ragSourcesUsed.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">RAG sources used by ProductFactPack</span>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {selectedTrace.ragSourcesUsed.slice(0, 6).map((rag, i) => (
                            <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-[11px]">
                              <span className="text-zinc-300">{rag.sourceType} · {rag.title}</span>
                              <span className="ml-2 text-zinc-500 font-mono">{rag.productId || rag.sourceId}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTrace.rejectedRagSources && selectedTrace.rejectedRagSources.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] text-red-400 uppercase font-bold">Rejected RAG Sources</span>
                        <div className="mt-2 flex flex-col gap-1.5">
                          {selectedTrace.rejectedRagSources.slice(0, 6).map((rag, i) => (
                            <div key={i} className="bg-red-950/10 border border-red-900/30 rounded-lg p-2 text-[11px]">
                              <span className="text-red-200/80">{rag.sourceType} · {rag.title}</span>
                              <span className="ml-2 text-red-300/60 font-mono">{rag.reason || "REJECTED"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTrace.groundingWarnings && selectedTrace.groundingWarnings.length > 0 && (
                      <div className="mt-3 bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5 text-xs text-amber-300">
                        <strong>Grounding Warnings:</strong>
                        <ul className="mt-1 list-disc pl-4 space-y-1">
                          {selectedTrace.groundingWarnings.map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Product Fact Pack */}
                <div className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-orange-950 border border-orange-900 text-orange-400 text-xs font-bold flex items-center justify-center z-10">
                    PF
                  </div>
                  <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Product Fact Pack</span>
                    {selectedTrace.productFactPacks && selectedTrace.productFactPacks.length > 0 ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {selectedTrace.productFactPacks.map((pack) => (
                          <div key={pack.productId} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-zinc-100 font-bold truncate">
                                {pack.koreanName} ({pack.name})
                              </span>
                              <span className="text-emerald-400 font-mono shrink-0">
                                {pack.priceKrw.toLocaleString()}원
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                              <div>id: <span className="font-mono text-zinc-300">{pack.productId}</span></div>
                              <div>url: <span className="font-mono text-zinc-300">{pack.productUrl}</span></div>
                              <div>image: <span className="font-mono text-zinc-300">{pack.imageUrl || pack.thumbnailUrl || "none"}</span></div>
                              <div>inventory rows: <span className="font-mono text-zinc-300">{pack.inventory?.length ?? 0}</span></div>
                              <div>fit: <span className="text-zinc-300">{pack.fit}</span></div>
                              <div>material: <span className="text-zinc-300">{pack.material}</span></div>
                              <div>stock: <span className="text-zinc-300">{pack.stockSummary.totalStock}</span></div>
                              <div>options: <span className="text-zinc-300">{pack.stockSummary.availableOptions.slice(0, 4).join(", ") || "-"}</span></div>
                            </div>
                            {pack.ragEvidenceTitles.length > 0 && (
                              <p className="mt-2 text-[11px] text-zinc-500">
                                evidence: {pack.ragEvidenceTitles.join(" · ")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 mt-2">No ProductFactPack generated for this trace.</p>
                    )}
                  </div>
                </div>

                {/* 6. Product Cards */}
                <div className="flex gap-4 relative">
                  <div className="w-6 h-6 rounded-full bg-yellow-950 border border-yellow-900 text-yellow-300 text-xs font-bold flex items-center justify-center z-10">
                    PC
                  </div>
                  <div className="flex-1 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                    <span className="text-[10px] text-yellow-300 font-bold uppercase tracking-wider">Product Cards Payload</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <span className="text-[10px] text-zinc-500 uppercase">Generated</span>
                        <p className="mt-1 text-zinc-200 font-mono">{selectedTrace.productCardsGenerated ? "true" : "false"}</p>
                      </div>
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <span className="text-[10px] text-zinc-500 uppercase">Count</span>
                        <p className="mt-1 text-zinc-200 font-mono">{selectedTrace.productCardsCount ?? selectedTrace.productCards?.length ?? 0}</p>
                      </div>
                      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
                        <span className="text-[10px] text-zinc-500 uppercase">Render Mode</span>
                        <p className="mt-1 text-zinc-200 font-mono">{selectedTrace.cardRenderMode || "-"}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                      <div>
                        card ids:{" "}
                        <span className="font-mono text-zinc-300">
                          {selectedTrace.productCardProductIds?.join(", ") || "-"}
                        </span>
                      </div>
                      <div>
                        missing images:{" "}
                        <span className="font-mono text-zinc-300">
                          {selectedTrace.missingImageProductIds?.join(", ") || "-"}
                        </span>
                      </div>
                      {selectedTrace.linkFallbackReason && (
                        <div className="md:col-span-2">
                          fallback reason:{" "}
                          <span className="font-mono text-amber-300">
                            {selectedTrace.linkFallbackReason}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedTrace.productCards && selectedTrace.productCards.length > 0 ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {selectedTrace.productCards.map((card) => (
                          <div key={card.productId} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-xs">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-zinc-100 font-bold truncate">{card.title}</span>
                              <span className="text-emerald-400 font-mono shrink-0">
                                {card.priceKrw ? `${card.priceKrw.toLocaleString()}원` : "-"}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                              <div>id: <span className="font-mono text-zinc-300">{card.productId}</span></div>
                              <div>url: <span className="font-mono text-zinc-300">{card.productUrl}</span></div>
                              <div>image: <span className="font-mono text-zinc-300">{card.imageUrl || "none"}</span></div>
                              <div>stock: <span className="font-mono text-zinc-300">{card.stockStatus || "unknown"}</span></div>
                              <div>badge: <span className="font-mono text-zinc-300">{card.badge || "-"}</span></div>
                              <div>cta: <span className="font-mono text-zinc-300">{card.ctaLabel || "상품 보기"}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 mt-3">No product cards attached to this answer.</p>
                    )}
                  </div>
                </div>

                {/* 7. Tool Execution */}
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
                            {selectedTrace.guardrailActions.fallbackReason && (
                              <span className="ml-1 text-amber-400 font-mono">({selectedTrace.guardrailActions.fallbackReason})</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            selectedTrace.answerUsedDbFacts ? "bg-emerald-950 border border-emerald-800 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                          }`}>
                            {selectedTrace.answerUsedDbFacts ? "✓" : "✗"}
                          </span>
                          <span className={selectedTrace.answerUsedDbFacts ? "text-zinc-200" : "text-zinc-500"}>
                            Answer Used DB Facts
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            selectedTrace.answerUsedRag ? "bg-cyan-950 border border-cyan-800 text-cyan-400" : "bg-zinc-800 text-zinc-500"
                          }`}>
                            {selectedTrace.answerUsedRag ? "✓" : "✗"}
                          </span>
                          <span className={selectedTrace.answerUsedRag ? "text-zinc-200" : "text-zinc-500"}>
                            Answer Used RAG
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                            selectedTrace.hallucinationGuardTriggered ? "bg-red-950 border border-red-800 text-red-400" : "bg-zinc-800 text-zinc-500"
                          }`}>
                            {selectedTrace.hallucinationGuardTriggered ? "✓" : "✗"}
                          </span>
                          <span className={selectedTrace.hallucinationGuardTriggered ? "text-zinc-200" : "text-zinc-500"}>
                            Hallucination Guard Triggered
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
