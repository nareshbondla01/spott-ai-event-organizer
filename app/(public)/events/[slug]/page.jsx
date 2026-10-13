"use client";

import { useParams, useRouter, notFound } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { format } from "date-fns";

import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Share2,
  Ticket,
  ExternalLink,
  Loader2,
  CheckCircle,
} from "lucide-react";

import { useUser } from "@clerk/nextjs";

import {
  useConvexQuery,
} from "@/hooks/use-convex-query";

import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

import {
  getCategoryIcon,
  getCategoryLabel,
} from "@/lib/data";

import RegisterModal from "./_components/register-modal";

/* -------------------------------------------------------------------------- */
/* Color Helper                                                               */
/* -------------------------------------------------------------------------- */

function darkenColor(
  color,
  amount = 0.04
) {
  if (
    !color ||
    typeof color !== "string"
  ) {
    return "#172554";
  }

  const normalized =
    color.replace("#", "");

  if (
    !/^[0-9a-fA-F]{6}$/.test(
      normalized
    )
  ) {
    return "#172554";
  }

  const num = parseInt(
    normalized,
    16
  );

  const r = Math.max(
    0,
    Math.round(
      (num >> 16) -
        amount * 255
    )
  );

  const g = Math.max(
    0,
    Math.round(
      ((num >> 8) & 0x00ff) -
        amount * 255
    )
  );

  const b = Math.max(
    0,
    Math.round(
      (num & 0x0000ff) -
        amount * 255
    )
  );

  return `#${(
    (r << 16) |
    (g << 8) |
    b
  )
    .toString(16)
    .padStart(6, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Date Helper                                                                */
/* -------------------------------------------------------------------------- */

function getValidDate(
  timestamp
) {
  if (
    typeof timestamp !==
      "number" ||
    !Number.isFinite(timestamp)
  ) {
    return null;
  }

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/* -------------------------------------------------------------------------- */
/* Event Detail Page                                                          */
/* -------------------------------------------------------------------------- */

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();

  const { user } = useUser();

  const [
    showRegisterModal,
    setShowRegisterModal,
  ] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Get Event                                                                */
  /* ------------------------------------------------------------------------ */

  const slug =
    typeof params?.slug ===
    "string"
      ? params.slug
      : "";

  const {
    data: event,
    isLoading,
  } = useConvexQuery(
    api.events.getEventBySlug,
    slug
      ? { slug }
      : "skip"
  );

  /* ------------------------------------------------------------------------ */
  /* Registration                                                             */
  /* ------------------------------------------------------------------------ */

  const {
    data: registration,
  } = useConvexQuery(
    api.registrations
      .checkRegistration,
    event?._id
      ? {
          eventId: event._id,
        }
      : "skip"
  );

  /* ------------------------------------------------------------------------ */
  /* Share Event                                                              */
  /* ------------------------------------------------------------------------ */

  const handleShare =
    async () => {
      if (!event) {
        return;
      }

      const url =
        window.location.href;

      if (
        navigator.share
      ) {
        try {
          await navigator.share(
            {
              title:
                event.title,

              text: `${event.title} - ${event.description.slice(
                0,
                100
              )}...`,

              url,
            }
          );
        } catch {
          /*
           * User cancelled the
           * share dialog.
           */
        }
      } else {
        try {
          await navigator.clipboard.writeText(
            url
          );

          toast.success(
            "Event link copied to clipboard!"
          );
        } catch {
          toast.error(
            "Unable to copy the event link."
          );
        }
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Register                                                                 */
  /* ------------------------------------------------------------------------ */

  const handleRegister =
    () => {
      if (!user) {
        toast.error(
          "Please sign in to register for this event."
        );
        return;
      }

      setShowRegisterModal(
        true
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
  /* Not Found                                                                */
  /* ------------------------------------------------------------------------ */

  if (!event) {
    notFound();
  }

  /* ------------------------------------------------------------------------ */
  /* Event Data                                                               */
  /* ------------------------------------------------------------------------ */

  const startDate =
    getValidDate(
      event.startDate
    );

  const endDate =
    getValidDate(
      event.endDate
    );

  const isEventFull =
    event.registrationCount >=
    event.capacity;

  const isEventPast =
    endDate
      ? endDate.getTime() <
        Date.now()
      : false;

  const backgroundColor =
    event.themeColor ||
    "#1e3a8a";

  const cardBackground =
    darkenColor(
      backgroundColor,
      0.04
    );

  /*
   * IMPORTANT:
   *
   * organizerId is a Convex user ID,
   * while Clerk's user.id is a Clerk ID.
   *
   * Therefore we do not compare them
   * directly here.
   *
   * The organizer can manage the event
   * from My Events instead.
   */

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      style={{
        backgroundColor,
      }}
      className="min-h-screen py-8 -mt-6 md:-mt-16 lg:-mx-5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">

        {/* ------------------------------------------------------------------ */}
        {/* Event Title                                                        */}
        {/* ------------------------------------------------------------------ */}

        <div className="mb-8">

          <Badge
            variant="secondary"
            className="mb-3"
          >
            {getCategoryIcon(
              event.category
            )}{" "}
            {getCategoryLabel(
              event.category
            )}
          </Badge>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />

              <span>
                {startDate
                  ? format(
                      startDate,
                      "EEEE, MMMM dd, yyyy"
                    )
                  : "Date unavailable"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />

              <span>
                {startDate &&
                endDate
                  ? `${format(
                      startDate,
                      "h:mm a"
                    )} - ${format(
                      endDate,
                      "h:mm a"
                    )}`
                  : "Time unavailable"}
              </span>
            </div>

          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Event Image                                                        */}
        {/* ------------------------------------------------------------------ */}

        {event.coverImage ? (
          <div className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden mb-6">

            <Image
              src={
                event.coverImage
              }
              alt={`${event.title} event cover`}
              fill
              unoptimized
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 1200px"
            />

          </div>
        ) : (
          <div
            className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden mb-6 flex items-center justify-center"
            style={{
              backgroundColor:
                cardBackground,
            }}
          >

            <div className="text-center">

              <div className="text-7xl mb-4">
                {getCategoryIcon(
                  event.category
                )}
              </div>

              <p className="text-muted-foreground">
                Event image not available
              </p>

            </div>

          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Main Grid                                                          */}
        {/* ------------------------------------------------------------------ */}

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">

          {/* ================================================================ */}
          {/* Main Content                                                     */}
          {/* ================================================================ */}

          <div className="space-y-8">

            {/* -------------------------------------------------------------- */}
            {/* Description                                                     */}
            {/* -------------------------------------------------------------- */}

            <Card
              className="pt-0"
              style={{
                backgroundColor:
                  cardBackground,
              }}
            >
              <CardContent className="pt-6">

                <h2 className="text-2xl font-bold mb-4">
                  About This Event
                </h2>

                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>

              </CardContent>
            </Card>

            {/* -------------------------------------------------------------- */}
            {/* Location                                                        */}
            {/* -------------------------------------------------------------- */}

            <Card
              className="pt-0"
              style={{
                backgroundColor:
                  cardBackground,
              }}
            >
              <CardContent className="pt-6">

                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-purple-500" />
                  Location
                </h2>

                <div className="space-y-3">

                  <p className="font-medium">
                    {event.locationType ===
                    "online"
                      ? "Online Event"
                      : `${event.city}${
                          event.state
                            ? `, ${event.state}`
                            : event.country
                              ? `, ${event.country}`
                              : ""
                        }`}
                  </p>

                  {event.address && (
                    <p className="text-sm text-muted-foreground">
                      {event.address}
                    </p>
                  )}

                  {event.venue && (
                    <div className="text-sm">
                      <p className="font-medium">
                        Venue
                      </p>

                      <p className="text-muted-foreground">
                        {event.venue}
                      </p>
                    </div>
                  )}

                </div>

              </CardContent>
            </Card>

            {/* -------------------------------------------------------------- */}
            {/* Organizer                                                       */}
            {/* -------------------------------------------------------------- */}

            <Card
              className="pt-0"
              style={{
                backgroundColor:
                  cardBackground,
              }}
            >
              <CardContent className="pt-6">

                <h2 className="text-2xl font-bold mb-4">
                  Organizer
                </h2>

                <div className="flex items-center gap-3">

                  <Avatar className="w-12 h-12">

                    <AvatarFallback>
                      {event.organizerName
                        ?.charAt(0)
                        .toUpperCase() ||
                        "O"}
                    </AvatarFallback>

                  </Avatar>

                  <div>

                    <p className="font-semibold">
                      {event.organizerName ||
                        "Event Organizer"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Event Organizer
                    </p>

                  </div>

                </div>

              </CardContent>
            </Card>

          </div>

          {/* ================================================================ */}
          {/* Sidebar                                                          */}
          {/* ================================================================ */}

          <div className="lg:sticky lg:top-24 h-fit">

            <Card
              className="overflow-hidden py-0"
              style={{
                backgroundColor:
                  cardBackground,
              }}
            >
              <CardContent className="p-6 space-y-4">

                {/* ---------------------------------------------------------- */}
                {/* Price                                                       */}
                {/* ---------------------------------------------------------- */}

                <div>

                  <p className="text-sm text-muted-foreground mb-1">
                    Price
                  </p>

                  <p className="text-3xl font-bold">
                    Free
                  </p>

                  <p className="text-xs text-muted-foreground mt-1">
                    No payment required
                  </p>

                </div>

                <Separator />

                {/* ---------------------------------------------------------- */}
                {/* Stats                                                       */}
                {/* ---------------------------------------------------------- */}

                <div className="space-y-3">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2 text-muted-foreground">

                      <Users className="w-4 h-4" />

                      <span className="text-sm">
                        Attendees
                      </span>

                    </div>

                    <p className="font-semibold">
                      {event.registrationCount ||
                        0}{" "}
                      /{" "}
                      {event.capacity ||
                        "—"}
                    </p>

                  </div>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2 text-muted-foreground">

                      <Calendar className="w-4 h-4" />

                      <span className="text-sm">
                        Date
                      </span>

                    </div>

                    <p className="font-semibold text-sm">
                      {startDate
                        ? format(
                            startDate,
                            "MMM dd, yyyy"
                          )
                        : "—"}
                    </p>

                  </div>

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2 text-muted-foreground">

                      <Clock className="w-4 h-4" />

                      <span className="text-sm">
                        Time
                      </span>

                    </div>

                    <p className="font-semibold text-sm">
                      {startDate
                        ? format(
                            startDate,
                            "h:mm a"
                          )
                        : "—"}
                    </p>

                  </div>

                </div>

                <Separator />

                {/* ---------------------------------------------------------- */}
                {/* Registration                                                */}
                {/* ---------------------------------------------------------- */}

                {registration ? (
                  <div className="space-y-3">

                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">

                      <CheckCircle className="w-5 h-5" />

                      <span className="font-medium">
                        You&apos;re registered!
                      </span>

                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={() =>
                        router.push(
                          "/my-tickets"
                        )
                      }
                    >
                      <Ticket className="w-4 h-4" />
                      View Ticket
                    </Button>

                  </div>
                ) : isEventPast ? (
                  <Button
                    className="w-full"
                    disabled
                  >
                    Event Ended
                  </Button>
                ) : isEventFull ? (
                  <Button
                    className="w-full"
                    disabled
                  >
                    Event Full
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2"
                    onClick={
                      handleRegister
                    }
                  >
                    <Ticket className="w-4 h-4" />
                    Register for Event
                  </Button>
                )}

                {/* ---------------------------------------------------------- */}
                {/* Share                                                       */}
                {/* ---------------------------------------------------------- */}

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={
                    handleShare
                  }
                >
                  <Share2 className="w-4 h-4" />
                  Share Event
                </Button>

                {/* ---------------------------------------------------------- */}
                {/* Organizer Dashboard                                         */}
                {/* ---------------------------------------------------------- */}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    router.push(
                      "/my-events"
                    )
                  }
                >
                  My Events
                </Button>

              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Registration Modal                                                   */}
      {/* -------------------------------------------------------------------- */}

      {showRegisterModal && (
        <RegisterModal
          event={event}
          isOpen={
            showRegisterModal
          }
          onClose={() =>
            setShowRegisterModal(
              false
            )
          }
        />
      )}

    </div>
  );
}