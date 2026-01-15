import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";

interface ChatDialogProps {
  messages: any[];
  onSendMessage: (msg: string) => void;
  disabled: boolean;
  isLoading: boolean;
}

export function ChatDialog({
  messages,
  onSendMessage,
  disabled,
  isLoading,
}: ChatDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* CHAT BUTTON */}
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="
            fixed bottom-6 right-6 z-40
            rounded-full px-5 py-4
            shadow-lg flex items-center gap-2
          "
        >
          <MessageSquare className="w-5 h-5" />
          Chat
        </Button>
      )}

      {/* CHAT PANEL */}
      {open && (
        <div
          className="
            fixed bottom-6 right-6 z-50
            w-[400px] h-[440px]   /* ✅ SMALLER SIZE */
            bg-background border rounded-xl
            shadow-2xl flex flex-col
          "
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <MessageSquare className="w-4 h-4 text-primary" />
              Support Chat
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* CHAT BODY */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              messages={messages}
              onSendMessage={onSendMessage}
              disabled={disabled}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </>
  );
}
