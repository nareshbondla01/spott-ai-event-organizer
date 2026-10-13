"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Trash2,
  X,
  QrCode,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";

import {
  getCategoryIcon,
  getCategoryLabel,
} from "@/lib/data";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/* Event Image                                                                */
/* -------------------------------------------------------------------------- */

function EventImage({
  event,
  className = "",
  priority = false,
}) {
  const [imageUrl, setImageUrl] = useState(
    event?.coverImage || ""
  );

  const [imageError, setImageError] = useState(false);

  /*
   * If the event object changes, update the displayed image.
   */
  useEffect(() => {
    setImageUrl(event?.coverImage || "");
    setImageError(false);
  }, [event?.coverImage]);

  const showFallback =
    !imageUrl || imageError;

  if (showFallback) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center text-4xl ${className}`}
        style={{
          backgroundColor:
            event?.themeColor || "#1e3a8a",
        }}
      >
        {getCategoryIcon(event?.category)}
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={`${event?.title || "Event"} cover image`}
      fill
      sizes="(max-width: 768px) 100vw, 500px"
      className={`object-cover transition-transform group-hover:scale-105 ${className}`}
      priority={priority}
      unoptimized
      onError={() => {
        setImageError(true);
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Safe Date Formatting                                                       */
/* -------------------------------------------------------------------------- */

function formatEventDate(timestamp, pattern) {
  if (
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp)
  ) {
    return "Date unavailable";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return format(date, pattern);
}

/* -------------------------------------------------------------------------- */
/* Event Card                                                                 */
/* -------------------------------------------------------------------------- */

export default function EventCard({
  event,
  onClick,
  onDelete,
  variant = "grid",
  action = null,
  className = "",
}) {
  if (!event) {
    return null;
  }

  const registrationCount =
    typeof event.registrationCount === "number"
      ? event.registrationCount
      : 0;

  const capacity =
    typeof event.capacity === "number"
      ? event.capacity
      : 0;

  /* ------------------------------------------------------------------------ */
  /* LIST VARIANT                                                             */
  /* ------------------------------------------------------------------------ */

  if (variant === "list") {
    return (
      <Card
        className={`py-0 group cursor-pointer hover:shadow-lg transition-all hover:border-purple-500/50 ${className}`}
        onClick={onClick}
      >
        <CardContent className="p-3 flex gap-3">
          {/* Event Image */}
          <div className="w-20 h-20 rounded-lg shrink-0 overflow-hidden relative">
            <EventImage
              event={event}
              priority={false}
            />
          </div>

          {/* Event Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1 group-hover:text-purple-400 transition-colors line-clamp-2">
              {event.title}
            </h3>

            <p className="text-xs text-muted-foreground mb-1">
              {formatEventDate(
                event.startDate,
                "EEE, dd MMM, HH:mm"
              )}
            </p>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <MapPin className="w-3 h-3 shrink-0" />

              <span className="line-clamp-1">
                {event.locationType === "online"
                  ? "Online Event"
                  : event.city || "Location unavailable"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3 shrink-0" />

              <span>
                {registrationCount} attending
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* GRID VARIANT                                                             */
  /* ------------------------------------------------------------------------ */

  return (
    <Card
      className={`overflow-hidden group pt-0 ${
        onClick
          ? "cursor-pointer hover:shadow-lg transition-all hover:border-purple-500/50"
          : ""
      } ${className}`}
      onClick={onClick}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Cover Image                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div className="relative h-48 overflow-hidden">
        <EventImage
          event={event}
          priority={false}
        />

        {/* Free Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary">
            Free
          </Badge>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Event Information                                                  */}
      {/* ------------------------------------------------------------------ */}

      <CardContent className="space-y-3">
        <div>
          <Badge
            variant="outline"
            className="mb-2"
          >
            {getCategoryIcon(event.category)}{" "}
            {getCategoryLabel(event.category)}
          </Badge>

          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-purple-400 transition-colors">
            {event.title}
          </h3>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          {/* Date */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 shrink-0" />

            <span>
              {formatEventDate(
                event.startDate,
                "PPP"
              )}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />

            <span className="line-clamp-1">
              {event.locationType === "online"
                ? "Online Event"
                : event.city
                  ? `${event.city}${
                      event.state
                        ? `, ${event.state}`
                        : event.country
                          ? `, ${event.country}`
                          : ""
                    }`
                  : "Location unavailable"}
            </span>
          </div>

          {/* Capacity */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0" />

            <span>
              {registrationCount} /{" "}
              {capacity || "—"} registered
            </span>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Actions                                                          */}
        {/* ---------------------------------------------------------------- */}

        {action && (
          <div className="flex gap-2 pt-2">
            {/* Primary action */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.(e);
              }}
            >
              {action === "event" ? (
                <>
                  <Eye className="w-4 h-4" />
                  View
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  Show Ticket
                </>
              )}
            </Button>

            {/* Delete / Cancel */}
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(event._id);
                }}
              >
                {action === "event" ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}