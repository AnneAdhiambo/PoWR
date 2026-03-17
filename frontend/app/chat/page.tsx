"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { Card } from "../components/ui";
import { ChatCircle, PaperPlaneTilt, MagnifyingGlass, DotsThreeVertical } from "phosphor-react";

interface Message {
  id: string;
  sender: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
}

interface Conversation {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
  messages: Message[];
}

export default function ChatPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("github_username");
    const storedEmail = localStorage.getItem("github_email");
    
    if (storedUsername) {
      setUsername(storedUsername);
      setDisplayName(storedUsername);
    }
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
    
    // Load conversations (mock data)
    setConversations([
      {
        id: "1",
        name: "Sarah Chen",
        lastMessage: "Thanks for the help with the API integration!",
        lastMessageTime: new Date(Date.now() - 5 * 60 * 1000),
        unread: 0,
        messages: [
          {
            id: "m1",
            sender: "Sarah Chen",
            senderId: "sarah",
            text: "Hey! I saw your profile and was impressed with your backend work.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isOwn: false,
          },
          {
            id: "m2",
            sender: displayName || username,
            senderId: username,
            text: "Thanks! I'd be happy to help with your project.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
            isOwn: true,
          },
          {
            id: "m3",
            sender: "Sarah Chen",
            senderId: "sarah",
            text: "Thanks for the help with the API integration!",
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            isOwn: false,
          },
        ],
      },
      {
        id: "2",
        name: "Alex Rodriguez",
        lastMessage: "When can we schedule a call?",
        lastMessageTime: new Date(Date.now() - 30 * 60 * 1000),
        unread: 2,
        messages: [
          {
            id: "m4",
            sender: "Alex Rodriguez",
            senderId: "alex",
            text: "Hi! I'm looking for a React developer for a project.",
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            isOwn: false,
          },
          {
            id: "m5",
            sender: "Alex Rodriguez",
            senderId: "alex",
            text: "When can we schedule a call?",
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            isOwn: false,
          },
        ],
      },
      {
        id: "3",
        name: "Tech Recruiter",
        lastMessage: "We have a position that might interest you.",
        lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        unread: 0,
        messages: [
          {
            id: "m6",
            sender: "Tech Recruiter",
            senderId: "recruiter",
            text: "We have a position that might interest you.",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isOwn: false,
          },
        ],
      },
    ]);

    // Set first conversation as active
    if (conversations.length > 0) {
      setActiveConversation(conversations[0].id);
    }
  }, [username, displayName]);

  useEffect(() => {
    if (conversations.length > 0 && !activeConversation) {
      setActiveConversation(conversations[0].id);
    }
  }, [conversations, activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation, conversations]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeConversation) return;

    const conversation = conversations.find(c => c.id === activeConversation);
    if (!conversation) return;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      sender: displayName || username,
      senderId: username,
      text: messageInput,
      timestamp: new Date(),
      isOwn: true,
    };

    setConversations(conversations.map(conv => 
      conv.id === activeConversation
        ? {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: messageInput,
            lastMessageTime: new Date(),
          }
        : conv
    ));

    setMessageInput("");
  };

  const activeConv = conversations.find(c => c.id === activeConversation);
  const filteredConversations = searchQuery
    ? conversations.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div className="min-h-screen bg-[#0b0c0f] flex">
      <Sidebar 
        username={username} 
        email={userEmail || undefined}
        displayName={displayName}
      />

      <div className="flex-1 flex overflow-hidden ml-60">
        {/* Conversations List */}
        <div className="w-80 border-r border-[rgba(255,255,255,0.04)] flex flex-col">
          <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
            <h1 className="text-xl font-semibold text-white mb-4" style={{ fontWeight: 500 }}>
              Messages
            </h1>
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" weight="regular" />
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
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversation;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`p-4 border-b border-[rgba(255,255,255,0.04)] cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[rgba(255,255,255,0.05)]"
                      : "hover:bg-[rgba(255,255,255,0.02)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF5500] to-[#4d85f0] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-lg">
                        {conv.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-medium text-white truncate">
                          {conv.name}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {conv.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400 truncate" style={{ opacity: 0.7 }}>
                          {conv.lastMessage}
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
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
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
                      Active now
                    </p>
                  </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                  <DotsThreeVertical className="w-5 h-5 text-gray-400" weight="regular" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeConv.messages.map((message) => (
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
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
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
                    className="p-2 rounded-lg bg-[#FF5500] hover:bg-[#4d85f0] text-white transition-colors"
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
                <p className="text-gray-400 mb-2">Select a conversation to start chatting</p>
                <p className="text-xs text-gray-500" style={{ opacity: 0.6 }}>
                  Your messages will appear here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

