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
  const [showSettings, setShowSettings] = useState(false);
  const [modelProvider, setModelProvider] = useState<ModelProvider>("gemini");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "안녕하세요, SLOWEON입니다.\n\n어떤 도움이 필요하신가요?\n\n- **상품 추천** — '아우터 추천해줘'\n- **사이즈 · 핏 정보** — 'top_01 상세 알려줘'\n- **재고 확인** — 'top_01 M사이즈 있어?'\n- **장바구니** — 'top_01 Black M 담아줘'"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // 챗봇 열릴 때 설정 패널 닫기
  useEffect(() => {
    if (!isOpen) setShowSettings(false);
  }, [isOpen]);

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
          content: "죄송합니다, 일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const renderMessageContent = (text: string) => {
    const cleanText = text.replace(/\[([^\]]+)\]\(\/products\/[^\)]+\)/g, "$1");

    return cleanText.split("\n").map((line, index) => {
      let content: React.ReactNode = line;

      if (line.startsWith("### ")) {
        content = <h4 className="chatbot-heading">{line.slice(4)}</h4>;
      } else if (line.startsWith("#### ")) {
        content = <h5 className="chatbot-subheading">{line.slice(5)}</h5>;
      } else if (line.startsWith("> ")) {
        content = <blockquote className="chatbot-quote">{line.slice(2)}</blockquote>;
      } else if (line.includes("**")) {
        const parts = line.split("**");
        content = parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="chatbot-bold">{part}</strong> : part));
      } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemText = line.replace(/^[\s*-]+/, "");
        content = (
          <li className="chatbot-list-item">
            {itemText.includes("**")
              ? itemText.split("**").map((part, i) => (i % 2 === 1 ? <strong key={i} className="chatbot-bold">{part}</strong> : part))
              : itemText
            }
          </li>
        );
      }

      return (
        <div key={index} className="chatbot-line">
          {content}
        </div>
      );
    });
  };

  return (
    <>
      {/* ─── 플로팅 버튼 ─── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chatbot-fab"
        aria-label="쇼핑 어시스턴트 열기"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="chatbot-fab-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="chatbot-fab-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </>
        )}
      </button>

      {/* ─── 챗봇 대화창 ─── */}
      {isOpen && (
        <div className="chatbot-container">

          {/* 헤더 */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-status-dot" />
              <div>
                <span className="chatbot-brand">sloweon</span>
                <span className="chatbot-label">SHOPPING ASSISTANT</span>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="chatbot-settings-btn"
                aria-label="설정"
                title="AI 모델 설정"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="chatbot-icon-sm">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="chatbot-close-btn" aria-label="닫기">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="chatbot-icon-sm">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* 설정 패널 (토글) */}
          {showSettings && (
            <div className="chatbot-settings-panel">
              <ModelSelector selected={modelProvider} onChange={setModelProvider} />
            </div>
          )}

          {/* 메시지 리스트 */}
          <div className="chatbot-messages">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const parsedProducts = isAssistant ? parseProductsFromMessage(message.content) : [];

              return (
                <div key={message.id} className={`chatbot-msg-row ${isAssistant ? "chatbot-msg-row--bot" : "chatbot-msg-row--user"}`}>
                  
                  {/* 말풍선 */}
                  <div className={`chatbot-bubble ${isAssistant ? "chatbot-bubble--bot" : "chatbot-bubble--user"}`}>
                    {isAssistant ? renderMessageContent(message.content) : message.content}
                  </div>

                  {/* 상품 추천 카드 */}
                  {parsedProducts.length > 0 && (
                    <div className="chatbot-product-list">
                      {parsedProducts.map((prod) => (
                        <Link
                          key={prod.id}
                          href={`/products/${prod.id}`}
                          onClick={() => setIsOpen(false)}
                          className="chatbot-product-card"
                        >
                          <div className="chatbot-product-thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="chatbot-product-img"
                            />
                          </div>
                          <div className="chatbot-product-info">
                            <p className="chatbot-product-id">{prod.id}</p>
                            <p className="chatbot-product-name">{prod.name}</p>
                          </div>
                          <div className="chatbot-product-arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="chatbot-icon-xs">
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
              <div className="chatbot-typing">
                <div className="chatbot-typing-dot" style={{ animationDelay: "0ms" }} />
                <div className="chatbot-typing-dot" style={{ animationDelay: "150ms" }} />
                <div className="chatbot-typing-dot" style={{ animationDelay: "300ms" }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 입력창 */}
          <form onSubmit={handleSendMessage} className="chatbot-input-area">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="무엇이든 물어보세요..."
              disabled={isLoading}
              className="chatbot-input"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="chatbot-send-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="chatbot-icon-sm">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>

        </div>
      )}
    </>
  );
}
