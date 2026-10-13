"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  Circle,
  Loader2,
  Mail,
  QrCode,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { api } from "@/convex/_generated/api";
import { useConvexMutation } from "@/hooks/use-convex-query";

export function AttendeeCard({
  registration,
}) {
  const [isProcessing, setIsProcessing] =
    useState(false);

  const {
    mutate: checkInAttendee,
  } = useConvexMutation(
    api.registrations.checkInAttendee
  );

  /* ------------------------------------------------------------------------ */
  /* Manual Check-In                                                          */
  /* ------------------------------------------------------------------------ */

  const handleManualCheckIn =
    async () => {
      if (
        !registration?.qrCode ||
        registration.checkedIn ||
        isProcessing
      ) {
        return;
      }

      setIsProcessing(true);

      try {
        const result =
          await checkInAttendee({
            qrCode:
              registration.qrCode,
          });

        if (result.success) {
          toast.success(
            `${registration.attendeeName} checked in successfully.`
          );
        } else {
          toast.error(
            result.message ||
              "Check-in failed."
          );
        }
      } catch (error) {
        console.error(
          "Manual check-in error:",
          error
        );

        toast.error(
          error?.message ||
            "Failed to check in attendee."
        );
      } finally {
        setIsProcessing(false);
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Safety Check                                                             */
  /* ------------------------------------------------------------------------ */

  if (!registration) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">

        <div className="flex items-start gap-4">

          {/* ---------------------------------------------------------------- */}
          {/* Check-In Status Icon                                             */}
          {/* ---------------------------------------------------------------- */}

          <div
            className={`mt-1 p-2 rounded-full shrink-0 ${
              registration.checkedIn
                ? "bg-green-100"
                : "bg-gray-100"
            }`}
          >
            {registration.checkedIn ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Attendee Information                                             */}
          {/* ---------------------------------------------------------------- */}

          <div className="flex-1 min-w-0">

            {/* Name */}
            <div className="flex items-center gap-2 mb-1">

              <User className="w-4 h-4 text-muted-foreground shrink-0" />

              <h3 className="font-semibold truncate">
                {registration.attendeeName}
              </h3>

            </div>

            {/* Email */}
            <div className="flex items-center gap-2 mb-3">

              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />

              <p className="text-sm text-muted-foreground truncate">
                {registration.attendeeEmail}
              </p>

            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Registration Information                                        */}
            {/* ---------------------------------------------------------------- */}

            <div className="flex flex-col gap-2 text-xs text-muted-foreground">

              <div className="flex items-center gap-2">

                {registration.checkedIn ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 shrink-0" />
                )}

                <span>
                  {registration.checkedIn
                    ? "Checked in"
                    : "Registered"}
                  {" • "}
                  {registration.checkedIn &&
                  registration.checkedInAt
                    ? format(
                        registration.checkedInAt,
                        "PPp"
                      )
                    : format(
                        registration.registeredAt,
                        "PPp"
                      )}
                </span>

              </div>

              {/* QR ID */}
              <div className="flex items-start gap-2">

                <QrCode className="w-3.5 h-3.5 shrink-0 mt-0.5" />

                <span className="font-mono break-all">
                  {registration.qrCode}
                </span>

              </div>

            </div>

          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Check-In Button                                                  */}
          {/* ---------------------------------------------------------------- */}

          {!registration.checkedIn && (
            <Button
              size="sm"
              variant="outline"
              onClick={
                handleManualCheckIn
              }
              disabled={isProcessing}
              className="gap-2 shrink-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    Check In
                  </span>
                  <span className="sm:hidden">
                    Check
                  </span>
                </>
              )}
            </Button>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Already Checked-In                                               */}
          {/* ---------------------------------------------------------------- */}

          {registration.checkedIn && (
            <div className="flex items-center gap-1 text-sm text-green-600 font-medium shrink-0">
              <CheckCircle className="w-4 h-4" />
              <span className="hidden sm:inline">
                Checked In
              </span>
            </div>
          )}

        </div>

      </CardContent>
    </Card>
  );
}