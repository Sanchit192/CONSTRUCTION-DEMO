import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  disabled,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit fired!", input, disabled);
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {/* Initial empty state */}
          {messages.length === 0 && !disabled && (
            <div className="flex flex-col items-center justify-center py-12 text-center fade-in">
              <div className="p-4 rounded-full bg-primary/10 mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Ask about your documents</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-[280px]">
                I can answer questions, compare documents, explain sections, or help you understand the content.
              </p>
            </div>
          )}

          {/* Disabled state */}
          {disabled && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center fade-in">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Bot className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-muted-foreground">Select Your Document</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Ask me Anything!
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 fade-in items-end",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] break-words px-3 py-2 rounded-lg whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none chat-bubble-user"
                    : "bg-gray-100 text-gray-800 rounded-bl-none chat-bubble-assistant"
                )}
              >
                <p className="text-sm">{message.content}</p>
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3 fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="chat-bubble-assistant px-3 py-2 rounded-lg bg-gray-100">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={disabled ? "Upload a document to start chatting..." : "Ask a question..."}
            disabled={disabled || isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || disabled}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
