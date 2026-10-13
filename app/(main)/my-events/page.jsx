"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useConvexQuery,
  useConvexMutation,
} from "@/hooks/use-convex-query";

import { api } from "@/convex/_generated/api";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EventCard from "@/components/event-card";

export default function MyEventsPage() {
  const router = useRouter();

  /* ------------------------------------------------------------------------ */
  /* Get My Events                                                            */
  /* ------------------------------------------------------------------------ */

  const {
    data: events,
    isLoading,
  } = useConvexQuery(
    api.events.getMyEvents
  );

  /* ------------------------------------------------------------------------ */
  /* Delete Event                                                             */
  /* ------------------------------------------------------------------------ */

  const {
    mutate: deleteEvent,
    isLoading: isDeleting,
  } = useConvexMutation(
    api.events.deleteEvent
  );

  /* ------------------------------------------------------------------------ */
  /* Delete Handler                                                           */
  /* ------------------------------------------------------------------------ */

  const handleDelete = async (
    eventId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this event? This action cannot be undone and will permanently delete the event and all associated registrations."
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEvent({
        eventId,
      });

      toast.success(
        "Event deleted successfully."
      );
    } catch (error) {
      console.error(
        "Delete event error:",
        error
      );

      toast.error(
        error?.message ||
          "Failed to delete event."
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Open Event Dashboard                                                     */
  /* ------------------------------------------------------------------------ */

  const handleEventClick = (
    eventId
  ) => {
    router.push(
      `/my-events/${eventId}`
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ------------------------------------------------------------------ */}
        {/* Header                                                             */}
        {/* ------------------------------------------------------------------ */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-4xl font-bold mb-2">
              My Events
            </h1>

            <p className="text-muted-foreground">
              Manage your created events
            </p>
          </div>

          {/* Unlimited Event Creation */}
          <Button
            asChild
            className="gap-2"
          >
            <Link href="/create-event">
              <Plus className="w-4 h-4" />
              Create Event
            </Link>
          </Button>

        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Empty State                                                        */}
        {/* ------------------------------------------------------------------ */}

        {!events ||
        events.length === 0 ? (
          <Card className="p-12 text-center">

            <div className="max-w-md mx-auto space-y-4">

              <div className="text-6xl mb-4">
                📅
              </div>

              <h2 className="text-2xl font-bold">
                No events yet
              </h2>

              <p className="text-muted-foreground">
                Create your first event and
                start managing attendees.
              </p>

              <Button
                asChild
                className="gap-2"
              >
                <Link href="/create-event">
                  <Plus className="w-4 h-4" />
                  Create Your First Event
                </Link>
              </Button>

            </div>

          </Card>
        ) : (
          /* -------------------------------------------------------------- */
          /* Event Grid                                                       */
          /* -------------------------------------------------------------- */

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                action="event"
                onClick={() =>
                  handleEventClick(
                    event._id
                  )
                }
                onDelete={
                  isDeleting
                    ? undefined
                    : handleDelete
                }
              />
            ))}

          </div>
        )}

      </div>
    </div>
  );
}