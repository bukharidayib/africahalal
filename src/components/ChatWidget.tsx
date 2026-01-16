import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-80 rounded-lg bg-card shadow-xl border animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <span className="font-semibold">Chat with AHIS</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 h-64 overflow-y-auto">
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium text-primary">Welcome to AHIS!</p>
              <p className="mt-1 text-muted-foreground">
                How can we assist you with Halal certification today?
              </p>
            </div>
          </div>
          <div className="p-4 border-t">
            <input
              type="text"
              placeholder="Type your message..."
              className="w-full rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-secondary text-secondary-foreground shadow-lg hover:bg-secondary/90"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}
