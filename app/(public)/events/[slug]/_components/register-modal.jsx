"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Ticket,
  CheckCircle,
  Calendar,
  MapPin,
} from "lucide-react";

import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function RegisterModal({
  event,
  isOpen,
  onClose,
}) {
  const router = useRouter();
  const { user } = useUser();

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Pre-fill User Information                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!user) {
      return;
    }

    setName(
      user.fullName ||
        user.firstName ||
        ""
    );

    setEmail(
      user.primaryEmailAddress
        ?.emailAddress || ""
    );
  }, [user]);

  /* ------------------------------------------------------------------------ */
  /* Reset Modal                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
    }
  }, [isOpen]);

  /* ------------------------------------------------------------------------ */
  /* Registration Mutation                                                    */
  /* ------------------------------------------------------------------------ */

  const {
    mutate: registerForEvent,
    isLoading,
  } = useConvexMutation(
    api.registrations.registerForEvent
  );

  /* ------------------------------------------------------------------------ */
  /* Submit Registration                                                      */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error(
        "Please sign in before registering."
      );
      return;
    }

    if (!event?._id) {
      toast.error(
        "Event information is missing."
      );
      return;
    }

    const trimmedName =
      name.trim();

    const trimmedEmail =
      email.trim();

    if (!trimmedName) {
      toast.error(
        "Please enter your full name."
      );
      return;
    }

    if (!trimmedEmail) {
      toast.error(
        "Please enter your email address."
      );
      return;
    }

    try {
      await registerForEvent({
        eventId: event._id,
        attendeeName: trimmedName,
        attendeeEmail: trimmedEmail,
      });

      setIsSuccess(true);

      toast.success(
        "Registration successful! 🎉"
      );
    } catch (error) {
      console.error(
        "Registration error:",
        error
      );

      toast.error(
        error?.message ||
          "Registration failed. Please try again."
      );
    }
  };

  /* ------------------------------------------------------------------------ */
  /* View Ticket                                                              */
  /* ------------------------------------------------------------------------ */

  const handleViewTicket = () => {
    onClose();

    router.push(
      "/my-tickets"
    );
  };

  /* ------------------------------------------------------------------------ */
  /* Close Modal                                                              */
  /* ------------------------------------------------------------------------ */

  const handleClose = () => {
    if (isLoading) {
      return;
    }

    setIsSuccess(false);
    onClose();
  };

  /* ------------------------------------------------------------------------ */
  /* No Event                                                                 */
  /* ------------------------------------------------------------------------ */

  if (!event) {
    return null;
  }

  /* ------------------------------------------------------------------------ */
  /* Success State                                                            */
  /* ------------------------------------------------------------------------ */

  if (isSuccess) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={handleClose}
      >
        <DialogContent className="sm:max-w-md">

          <div className="flex flex-col items-center text-center space-y-4 py-6">

            {/* Success Icon */}

            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            {/* Success Message */}

            <div>
              <h2 className="text-2xl font-bold mb-2">
                You&apos;re All Set!
              </h2>

              <p className="text-muted-foreground">
                Your registration is
                confirmed. Your free
                ticket with QR code is
                ready.
              </p>
            </div>

            {/* Event */}

            <div className="w-full bg-muted rounded-lg p-4">
              <p className="font-semibold">
                {event.title}
              </p>

              <p className="text-sm text-green-600 mt-1">
                Free Event
              </p>
            </div>

            <Separator />

            {/* Actions */}

            <div className="w-full space-y-2">

              <Button
                className="w-full gap-2"
                onClick={
                  handleViewTicket
                }
              >
                <Ticket className="w-4 h-4" />
                View My Ticket
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={
                  handleClose
                }
              >
                Close
              </Button>

            </div>

          </div>

        </DialogContent>
      </Dialog>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Registration Form                                                        */
  /* ------------------------------------------------------------------------ */

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleClose}
    >
      <DialogContent className="sm:max-w-md">

        <DialogHeader>

          <DialogTitle>
            Register for Event
          </DialogTitle>

          <DialogDescription>
            Register for{" "}
            <span className="font-medium">
              {event.title}
            </span>
          </DialogDescription>

        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* ---------------------------------------------------------------- */}
          {/* Event Summary                                                    */}
          {/* ---------------------------------------------------------------- */}

          <div className="bg-muted p-4 rounded-lg space-y-3">

            <p className="font-semibold">
              {event.title}
            </p>

            {/* Free Event */}

            <div className="flex items-center gap-2 text-sm">

              <Ticket className="w-4 h-4 text-green-600" />

              <span className="font-medium text-green-600">
                Free Event
              </span>

            </div>

            {/* Date */}

            {event.startDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">

                <Calendar className="w-4 h-4" />

                <span>
                  {new Date(
                    event.startDate
                  ).toLocaleString(
                    undefined,
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    }
                  )}
                </span>

              </div>
            )}

            {/* Location */}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">

              <MapPin className="w-4 h-4" />

              <span>
                {event.locationType ===
                "online"
                  ? "Online Event"
                  : event.city ||
                    "Location provided by organizer"}
              </span>

            </div>

          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Full Name                                                        */}
          {/* ---------------------------------------------------------------- */}

          <div className="space-y-2">

            <Label htmlFor="register-name">
              Full Name
            </Label>

            <Input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value
                )
              }
              placeholder="John Doe"
              autoComplete="name"
              disabled={isLoading}
              required
            />

          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Email                                                             */}
          {/* ---------------------------------------------------------------- */}

          <div className="space-y-2">

            <Label htmlFor="register-email">
              Email
            </Label>

            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="john@example.com"
              autoComplete="email"
              disabled={isLoading}
              required
            />

          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Ticket Information                                               */}
          {/* ---------------------------------------------------------------- */}

          <div className="rounded-lg border p-3">

            <p className="text-sm text-muted-foreground">
              By registering, you will
              receive a free event ticket
              with a unique QR code.
            </p>

          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Terms                                                             */}
          {/* ---------------------------------------------------------------- */}

          <p className="text-xs text-muted-foreground">
            By registering, you agree to
            receive event updates and
            reminders via email.
          </p>

          {/* ---------------------------------------------------------------- */}
          {/* Actions                                                           */}
          {/* ---------------------------------------------------------------- */}

          <div className="flex gap-2 pt-2">

            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={
                isLoading ||
                !user
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  Register Free
                </>
              )}
            </Button>

          </div>

        </form>

      </DialogContent>
    </Dialog>
  );
}