"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChatCircle, PaperPlaneTilt, MagnifyingGlass, DotsThreeVertical } from "phosphor-react";
import { useNostr } from "../../../app/hooks/useNostr";

function RecruiterChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withPubkey = searchParams.get("with");
  const withName = searchParams.get("name");

  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    const email = localStorage.getItem("recruiter_email") || "";
    setRecruiterEmail(email);
  }, []);

  const { conversations: nostrConvs, sendMessage, connected, openConversation, markRead } =
    useNostr(recruiterEmail, "recruiter");

  // Open conversation from URL param (?with=pubkey&name=username)
  useEffect(() => {
    if (withPubkey && recruiterEmail) {
      openConversation(withPubkey, withName || `${withPubkey.slice(0, 8)}...`);
      setActiveConversation(withPubkey);
    }
  }, [withPubkey, withName, recruiterEmail, openConversation]);

  useEffect(() => {
    if (nostrConvs.length > 0 && !activeConversation && !withPubkey) {
      setActiveConversation(nostrConvs[0].id);
    }
  }, [nostrConvs, activeConversation, withPubkey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation, nostrConvs]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;
    const conv = nostrConvs.find((c) => c.id === activeConversation);
    if (!conv) return;
    try {
      await sendMessage(conv.recipientPubkey, messageInput);
      setMessageInput("");
    } catch {
      // silently ignore
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    markRead(id);
  };

  const activeConv = nostrConvs.find((c) => c.id === activeConversation);
  const filteredConversations = searchQuery
    ? nostrConvs.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : nostrConvs;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Conversations List */}
      <div className="w-80 border-r border-[rgba(255,255,255,0.04)] flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-xl font-semibold text-white" style={{ fontWeight: 500 }}>
              Messages
            </h1>
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? "bg-emerald-400" : "bg-gray-600"}`}
              title={connected ? "Connected" : "Connecting..."}
            />
          </div>
          <div className="relative">
            <MagnifyingGlass
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
              weight="regular"
            />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF5500]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <ChatCircle className="w-10 h-10 text-gray-700 mb-3" weight="regular" />
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Contact developers from their profile pages
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversation;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`p-4 border-b border-[rgba(255,255,255,0.04)] cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[rgba(255,255,255,0.05)]"
                      : "hover:bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5500] to-[#4d85f0] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {conv.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-white truncate">
                          {conv.name}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {conv.lastMessageTime.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p
                          className="text-xs text-gray-400 truncate"
                          style={{ opacity: 0.7 }}
                        >
                          {conv.lastMessage || "Start a conversation"}
                        </p>
                        {conv.unread > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF5500] text-white text-xs font-medium flex-shrink-0 ml-2">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF5500] to-[#4d85f0] flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {activeConv.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{activeConv.name}</h2>
                  <p className="text-xs text-gray-400" style={{ opacity: 0.6 }}>
                    via Nostr
                  </p>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <DotsThreeVertical className="w-5 h-5 text-gray-400" weight="regular" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConv.messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <ChatCircle className="w-10 h-10 text-gray-600 mx-auto mb-2" weight="regular" />
                    <p className="text-xs text-gray-500">Send a message to start the conversation</p>
                  </div>
                </div>
              ) : (
                activeConv.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        message.isOwn
                          ? "bg-[#FF5500] text-white"
                          : "bg-[rgba(255,255,255,0.03)] text-gray-200 border border-[rgba(255,255,255,0.04)]"
                      } rounded-lg px-4 py-2`}
                    >
                      {!message.isOwn && (
                        <p className="text-xs font-medium mb-1" style={{ opacity: 0.8 }}>
                          {message.sender}
                        </p>
                      )}
                      <p className="text-sm">{message.text}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.isOwn ? "text-orange-100" : "text-gray-500"
                        }`}
                        style={{ opacity: 0.7 }}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#FF5500]"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white transition-colors"
                >
                  <PaperPlaneTilt className="w-5 h-5" weight="regular" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ChatCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" weight="regular" />
              <p className="text-gray-400 mb-2">
                {nostrConvs.length === 0
                  ? "No conversations yet"
                  : "Select a conversation"}
              </p>
              <p className="text-xs text-gray-500" style={{ opacity: 0.6 }}>
                {nostrConvs.length === 0
                  ? "Contact a developer from their profile to start messaging"
                  : "Your messages will appear here"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecruiterChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <RecruiterChatContent />
    </Suspense>
  );
}
