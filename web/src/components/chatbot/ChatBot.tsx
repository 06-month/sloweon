"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ModelSelector, { ModelProvider } from "./ModelSelector";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ParsedProduct {
  name: string;
  id: string;
  category: "tops" | "bottoms";
  imageUrl: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [modelProvider, setModelProvider] = useState<ModelProvider>("gemini");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "안녕하세요! SLOWEON 쇼핑 챗봇입니다. 무엇을 도와드릴까요?\n\n- **상품 추천** (예: '아우터 추천해줘', '차콜색 옷 있어?')\n- **사이즈/모델 핏 정보** (예: 'top_01 상세 정보 알려줘')\n- **실시간 재고 조회** (예: 'top_01 M사이즈 재고 남아있어?')\n- **장바구니 담기** (예: 'top_01 Black M 장바구니에 담아줘')"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 대화 추가 시 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelProvider,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) throw new Error("API call failed");

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.content
        }
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "죄송합니다. 메시지 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 마크다운 형식의 [상품명](/products/상품ID) 감지 및 파싱 함수
  const parseProductsFromMessage = (content: string): ParsedProduct[] => {
    const products: ParsedProduct[] = [];
    const regex = /\[([^\]]+)\]\(\/products\/([a-zA-Z0-9_-]+)\)/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const name = match[1];
      const id = match[2];
      const category = id.startsWith("top") ? "tops" : "bottoms";
      const imageUrl = `/menswear_demo_assets/${category}/${id}/detail_image.png`;
      
      if (!products.some((p) => p.id === id)) {
        products.push({ name, id, category, imageUrl });
      }
    }
    return products;
  };

  // 마크다운 텍스트를 파싱하여 볼드, 인용구, 목록 등으로 간이 렌더링하는 함수
  const renderMessageContent = (text: string) => {
    // 1. 상품 링크 텍스트의 괄호들을 정리하여 일반 텍스트 가독성을 높임 (카드는 하단에 별도 노출됨)
    const cleanText = text.replace(/\[([^\]]+)\]\(\/products\/[^\)]+\)/g, "$1");
    
    return cleanText.split("\n").map((line, index) => {
      let content: React.ReactNode = line;
      
      if (line.startsWith("### ")) {
        content = <h4 className="font-semibold text-white mt-2 mb-1 text-sm">{line.slice(4)}</h4>;
      } else if (line.startsWith("#### ")) {
        content = <h5 className="font-medium text-gray-200 mt-2 mb-1 text-xs">{line.slice(5)}</h5>;
      } else if (line.startsWith("> ")) {
        content = <blockquote className="border-l-2 border-zinc-500 pl-2 text-zinc-400 italic my-1">{line.slice(2)}</blockquote>;
      } else if (line.includes("**")) {
        const parts = line.split("**");
        content = parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-white">{part}</strong> : part));
      } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemText = line.replace(/^[\s*-]+/, "");
        content = (
          <li className="list-none pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-zinc-500">
            {itemText.includes("**") 
              ? itemText.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-bold text-white">{part}</strong> : part))
              : itemText
            }
          </li>
        );
      }

      return (
        <div key={index} className="min-h-[1.2rem]">
          {content}
        </div>
      );
    });
  };

  return (
    <>
      {/* 플로팅 버튼 - 럭셔리 실버-그레이 그라데이션 및 부드러운 그림자 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-zinc-700 shadow-2xl text-white hover:scale-105 active:scale-95 transition-all duration-300 ease-out focus:outline-none"
        aria-label="쇼핑 챗봇 열기"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 animate-pulse">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        )}
      </button>

      {/* 챗봇 대화창 - 글래스모피즘 테마 */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col w-[360px] h-[520px] rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out">
          
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-white text-xs tracking-wide">SLOWEON 어시스턴트</span>
            </div>
            <div className="flex items-center space-x-3">
              <ModelSelector selected={modelProvider} onChange={setModelProvider} />
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* 메시지 리스트 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const parsedProducts = isAssistant ? parseProductsFromMessage(message.content) : [];
              
              return (
                <div key={message.id} className={`flex flex-col ${isAssistant ? "items-start" : "items-end"}`}>
                  
                  {/* 말풍선 */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isAssistant
                        ? "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm"
                        : "bg-white text-zinc-950 rounded-tr-sm font-medium"
                    }`}
                  >
                    {isAssistant ? renderMessageContent(message.content) : message.content}
                  </div>

                  {/* 상품 추천 카드 리스트 */}
                  {parsedProducts.length > 0 && (
                    <div className="w-full mt-2 grid grid-cols-1 gap-2 pl-2">
                      {parsedProducts.map((prod) => (
                        <Link
                          key={prod.id}
                          href={`/products/${prod.id}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center space-x-3 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all group"
                        >
                          <div className="relative w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{prod.id}</p>
                            <p className="text-xs font-semibold text-white truncate group-hover:text-zinc-200 transition-colors">
                              {prod.name}
                            </p>
                          </div>
                          <div className="text-zinc-400 group-hover:text-white transition-colors pr-1">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex items-center space-x-1.5 pl-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 입력창 */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="SLOWEON 상품 정보를 물어보세요..."
              disabled={isLoading}
              className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs placeholder-zinc-500 focus:outline-none focus:border-zinc-700 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>

        </div>
      )}
    </>
  );
}
