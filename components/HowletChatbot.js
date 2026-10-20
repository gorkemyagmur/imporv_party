"use client";

import { useState, useRef, useEffect } from "react";

export default function HowletChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message to chat
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call Howlet API Endpoint
      const response = await fetch(
        "https://acme.on-prem-k3s-dev.howlet.ai/api/v1/endpoints/tekno/invoke",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "hk_Rt5HfyrrHpCEiJ_RkugadkgpDlgeE_FcidHqUAXKvnc",
          },
          body: JSON.stringify({
            input: {
              message: input,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract assistant response
      const reply = data?.data?.output ?? data?.output;
      const assistantMessage =
        typeof reply === "string" && reply
          ? reply
          : "Özür dilerim, bir hata oluştu.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMessage },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Bağlantı hatası. Lütfen daha sonra tekrar deneyin.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-32px)] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 px-4 py-3 flex items-center justify-between">
            <h2 className="text-white font-semibold">Hacettepe Asistanı</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:opacity-80 transition text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3 max-h-96">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 text-sm py-8">
                <p className="font-medium">Merhaba! 👋</p>
                <p className="text-xs mt-2">Size nasıl yardımcı olabilirim?</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-900 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-gray-200 p-3 bg-white flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesajınızı yazın..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-fuchsia-400 to-pink-400 text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              Gönder
            </button>
          </form>
        </div>
      )}

      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white shadow-lg hover:shadow-xl transition hover:scale-110 flex items-center justify-center text-2xl"
          title="Sohbet aç"
        >
          💬
        </button>
      )}
    </div>
  );
}
