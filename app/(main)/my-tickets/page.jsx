"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  Loader2,
  Ticket,
  User,
  Mail,
  CheckCircle,
} from "lucide-react";

import {
  useConvexQuery,
  useConvexMutation,
} from "@/hooks/use-convex-query";

import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import Link from "next/link";
import EventCard from "@/components/event-card";

export default function MyTicketsPage() {
  const [selectedTicket, setSelectedTicket] =
    useState(null);

  /* ------------------------------------------------------------------------ */
  /* Get Registrations                                                        */
  /* ------------------------------------------------------------------------ */

  const {
    data: registrations,
    isLoading,
  } = useConvexQuery(
    api.registrations.getMyRegistrations
  );

  /* ------------------------------------------------------------------------ */
  /* Cancel Registration                                                      */
  /* ------------------------------------------------------------------------ */

  const {
    mutate: cancelRegistration,
    isLoading: isCancelling,
  } = useConvexMutation(
    api.registrations.cancelRegistration
  );

  const handleCancelRegistration =
    async (registrationId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to cancel this registration?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await cancelRegistration({
          registrationId,
        });

        setSelectedTicket(null);

        toast.success(
          "Registration cancelled successfully."
        );
      } catch (error) {
        console.error(
          "Cancel registration error:",
          error
        );

        toast.error(
          error?.message ||
            "Failed to cancel registration."
        );
      }
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
  /* Split Tickets                                                            */
  /* ------------------------------------------------------------------------ */

  const now = Date.now();

  const validRegistrations =
    registrations?.filter(
      (registration) =>
        registration?.event
    ) || [];

  const upcomingTickets =
    validRegistrations.filter(
      (registration) =>
        registration.status ===
          "confirmed" &&
        registration.event.startDate >=
          now
    );

  const pastTickets =
    validRegistrations.filter(
      (registration) =>
        registration.status ===
          "cancelled" ||
        registration.event.startDate <
          now
    );

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen pb-20 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ------------------------------------------------------------------ */}
        {/* Header                                                             */}
        {/* ------------------------------------------------------------------ */}

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            My Tickets
          </h1>

          <p className="text-muted-foreground">
            View your event tickets and show
            your QR code at the entrance.
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Upcoming Events                                                    */}
        {/* ------------------------------------------------------------------ */}

        {upcomingTickets.length > 0 && (
          <div className="mb-12">

            <div className="mb-4">
              <h2 className="text-2xl font-bold">
                Upcoming Events
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                Open your ticket to display
                the QR code.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              {upcomingTickets.map(
                (registration) => (
                  <EventCard
                    key={
                      registration._id
                    }
                    event={
                      registration.event
                    }
                    action="ticket"
                    onClick={() =>
                      setSelectedTicket(
                        registration
                      )
                    }
                    onDelete={() =>
                      handleCancelRegistration(
                        registration._id
                      )
                    }
                  />
                )
              )}

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Past Events                                                        */}
        {/* ------------------------------------------------------------------ */}

        {pastTickets.length > 0 && (
          <div>

            <h2 className="text-2xl font-bold mb-4">
              Past Events
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              {pastTickets.map(
                (registration) => (
                  <EventCard
                    key={
                      registration._id
                    }
                    event={
                      registration.event
                    }
                    action={null}
                    className="opacity-60"
                  />
                )
              )}

            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Empty State                                                        */}
        {/* ------------------------------------------------------------------ */}

        {upcomingTickets.length ===
          0 &&
          pastTickets.length ===
            0 && (
            <Card className="p-12 text-center">

              <div className="max-w-md mx-auto space-y-4">

                <div className="text-6xl mb-4">
                  🎟️
                </div>

                <h2 className="text-2xl font-bold">
                  No tickets yet
                </h2>

                <p className="text-muted-foreground">
                  Register for events to see
                  your tickets here.
                </p>

                <Button
                  asChild
                  className="gap-2"
                >
                  <Link href="/explore">
                    <Ticket className="w-4 h-4" />
                    Browse Events
                  </Link>
                </Button>

              </div>

            </Card>
          )}

      </div>

      {/* ==================================================================== */}
      {/* TICKET MODAL                                                         */}
      {/* ==================================================================== */}

      {selectedTicket && (
        <Dialog
          open={!!selectedTicket}
          onOpenChange={() =>
            setSelectedTicket(null)
          }
        >
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">

            <DialogHeader>
              <DialogTitle className="text-center text-2xl">
                Event Ticket
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">

              {/* ------------------------------------------------------------ */}
              {/* Event Header                                                  */}
              {/* ------------------------------------------------------------ */}

              <div className="text-center">

                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 mb-3">
                  <Ticket className="w-6 h-6 text-purple-600" />
                </div>

                <h2 className="font-bold text-xl">
                  {selectedTicket.event.title}
                </h2>

                <p className="text-sm text-green-600 font-medium mt-1">
                  Free Event
                </p>

              </div>

              {/* ------------------------------------------------------------ */}
              {/* QR Code                                                       */}
              {/* ------------------------------------------------------------ */}

              <div className="rounded-xl border bg-white p-6">

                <div className="flex justify-center">
                  <QRCode
                    value={
                      selectedTicket.qrCode
                    }
                    size={240}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>

                <div className="text-center mt-4">

                  <p className="font-semibold text-black">
                    Scan this QR code
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Show this code at the event
                    entrance
                  </p>

                </div>

              </div>

              {/* ------------------------------------------------------------ */}
              {/* Ticket ID                                                      */}
              {/* ------------------------------------------------------------ */}

              <div className="text-center">

                <p className="text-xs text-muted-foreground mb-1">
                  Ticket ID
                </p>

                <p className="font-mono text-xs break-all">
                  {selectedTicket.qrCode}
                </p>

              </div>

              {/* ------------------------------------------------------------ */}
              {/* Attendee Information                                          */}
              {/* ------------------------------------------------------------ */}

              <div className="bg-muted p-4 rounded-lg space-y-3">

                <div className="flex items-center gap-3">

                  <User className="w-4 h-4 text-muted-foreground" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Attendee
                    </p>

                    <p className="font-medium">
                      {
                        selectedTicket.attendeeName
                      }
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <Mail className="w-4 h-4 text-muted-foreground" />

                  <div className="min-w-0">

                    <p className="text-xs text-muted-foreground">
                      Email
                    </p>

                    <p className="font-medium break-all">
                      {
                        selectedTicket.attendeeEmail
                      }
                    </p>

                  </div>

                </div>

              </div>

              {/* ------------------------------------------------------------ */}
              {/* Event Information                                             */}
              {/* ------------------------------------------------------------ */}

              <div className="bg-muted p-4 rounded-lg space-y-3 text-sm">

                <div className="flex items-start gap-3">

                  <Calendar className="w-4 h-4 mt-0.5 shrink-0" />

                  <div>

                    <p className="text-xs text-muted-foreground">
                      Date & Time
                    </p>

                    <p className="font-medium">
                      {format(
                        selectedTicket.event.startDate,
                        "PPP, h:mm a"
                      )}
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      Until{" "}
                      {format(
                        selectedTicket.event.endDate,
                        "PPP, h:mm a"
                      )}
                    </p>

                  </div>

                </div>

                <div className="flex items-start gap-3">

                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />

                  <div>

                    <p className="text-xs text-muted-foreground">
                      Location
                    </p>

                    <p className="font-medium">

                      {selectedTicket.event
                        .locationType ===
                      "online"
                        ? "Online Event"
                        : `${selectedTicket.event.city}, ${
                            selectedTicket.event.state ||
                            selectedTicket.event.country
                          }`}

                    </p>

                    {selectedTicket.event
                      .venue && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {
                          selectedTicket.event
                            .venue
                        }
                      </p>
                    )}

                  </div>

                </div>

              </div>

              {/* ------------------------------------------------------------ */}
              {/* Ticket Status                                                  */}
              {/* ------------------------------------------------------------ */}

              {selectedTicket.checkedIn ? (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-green-700">

                  <CheckCircle className="w-4 h-4" />

                  <span className="font-medium">
                    Checked in successfully
                  </span>

                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-blue-700">

                  <Ticket className="w-4 h-4" />

                  <span className="font-medium">
                    Ready for check-in
                  </span>

                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* Instruction                                                    */}
              {/* ------------------------------------------------------------ */}

              <p className="text-xs text-muted-foreground text-center">
                Keep this ticket ready on your
                phone. The event organizer will
                scan this QR code at the entrance.
              </p>

              {/* ------------------------------------------------------------ */}
              {/* Close                                                          */}
              {/* ------------------------------------------------------------ */}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  setSelectedTicket(null)
                }
              >
                Close
              </Button>

            </div>

          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}