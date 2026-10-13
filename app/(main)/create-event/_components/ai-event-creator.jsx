"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AIEventCreator({ onEventGenerated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const generateEvent = async () => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      toast.error("Please describe your event.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/generate-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
        }),
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("The AI service returned an invalid response.");
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to generate event details."
        );
      }

      if (!data || typeof data !== "object") {
        throw new Error("Invalid event data received from AI.");
      }

      /*
       * Only send the generated event data back to the
       * Create Event page.
       *
       * Payment/ticket information is intentionally ignored
       * by the Create Event page because all Spott events
       * are free.
       */
      if (typeof onEventGenerated === "function") {
        onEventGenerated(data);
      }

      toast.success(
        "Event details generated! Review and customize them below."
      );

      setIsOpen(false);
      setPrompt("");
    } catch (error) {
      console.error("AI event generation error:", error);

      toast.error(
        error?.message ||
          "Failed to generate event. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open) => {
    if (loading) {
      return;
    }

    setIsOpen(open);

    if (!open) {
      setPrompt("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate with AI
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Event Creator
          </DialogTitle>

          <DialogDescription>
            Describe your event idea and AI will generate event
            details for you. You can review and edit everything
            before creating the event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Create a technology meetup in Bangalore for 100 developers about React and modern web development."
            rows={7}
            className="resize-none"
            disabled={loading}
          />

          <p className="text-xs text-muted-foreground">
            Tip: Include the event type, topic, audience,
            location, approximate capacity, and any important
            requirements.
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={generateEvent}
              disabled={loading || !prompt.trim()}
              className="flex-1 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}