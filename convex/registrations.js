import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* -------------------------------------------------------------------------- */
/* Generate Unique QR Code                                                    */
/* -------------------------------------------------------------------------- */

function generateQRCode() {
    return `EVT-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 11)
    .toUpperCase()}`;
}

/* -------------------------------------------------------------------------- */
/* Register For Event                                                         */
/* -------------------------------------------------------------------------- */

export const registerForEvent = mutation({
    args: {
        eventId: v.id("events"),
        attendeeName: v.string(),
        attendeeEmail: v.string(),
    },

    handler: async(ctx, args) => {
        /* ---------------------------------------------------------------------- */
        /* Authentication                                                         */
        /* ---------------------------------------------------------------------- */

        const user = await ctx.runQuery(
            internal.users.getCurrentUser
        );

        if (!user) {
            throw new Error(
                "Please sign in to register for this event."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Validate Attendee Information                                          */
        /* ---------------------------------------------------------------------- */

        const attendeeName = args.attendeeName.trim();
        const attendeeEmail = args.attendeeEmail.trim();

        if (!attendeeName) {
            throw new Error("Attendee name is required.");
        }

        if (!attendeeEmail) {
            throw new Error("Attendee email is required.");
        }

        /* ---------------------------------------------------------------------- */
        /* Get Event                                                              */
        /* ---------------------------------------------------------------------- */

        const event = await ctx.db.get(args.eventId);

        if (!event) {
            throw new Error("Event not found.");
        }

        /* ---------------------------------------------------------------------- */
        /* Event Must Be Free                                                     */
        /* ---------------------------------------------------------------------- */

        if (event.ticketType !== "free") {
            throw new Error(
                "This event is not available for free registration."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Event Date Check                                                       */
        /* ---------------------------------------------------------------------- */

        if (event.endDate <= Date.now()) {
            throw new Error(
                "Registration for this event has ended."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Capacity Check                                                         */
        /* ---------------------------------------------------------------------- */

        if (event.registrationCount >= event.capacity) {
            throw new Error("Event is full.");
        }

        /* ---------------------------------------------------------------------- */
        /* Existing Registration Check                                            */
        /* ---------------------------------------------------------------------- */

        const existingRegistration = await ctx.db
            .query("registrations")
            .withIndex("by_event_user", (q) =>
                q
                .eq("eventId", args.eventId)
                .eq("userId", user._id)
            )
            .unique();

        /* ---------------------------------------------------------------------- */
        /* Prevent Duplicate Active Registration                                  */
        /* ---------------------------------------------------------------------- */

        if (
            existingRegistration &&
            existingRegistration.status === "confirmed"
        ) {
            throw new Error(
                "You are already registered for this event."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Reuse Cancelled Registration                                           */
        /* ---------------------------------------------------------------------- */

        if (
            existingRegistration &&
            existingRegistration.status === "cancelled"
        ) {
            const qrCode = generateQRCode();
            const registeredAt = Date.now();

            await ctx.db.patch(
                existingRegistration._id, {
                    attendeeName,
                    attendeeEmail,
                    qrCode,
                    checkedIn: false,
                    checkedInAt: undefined,
                    status: "confirmed",
                    registeredAt,
                }
            );

            await ctx.db.patch(args.eventId, {
                registrationCount: event.registrationCount + 1,
            });

            return existingRegistration._id;
        }

        /* ---------------------------------------------------------------------- */
        /* Create New Registration                                                */
        /* ---------------------------------------------------------------------- */

        const qrCode = generateQRCode();
        const registeredAt = Date.now();

        const registrationId = await ctx.db.insert(
            "registrations", {
                eventId: args.eventId,
                userId: user._id,

                attendeeName,
                attendeeEmail,

                qrCode,

                checkedIn: false,
                checkedInAt: undefined,

                status: "confirmed",

                registeredAt,
            }
        );

        /* ---------------------------------------------------------------------- */
        /* Update Registration Count                                              */
        /* ---------------------------------------------------------------------- */

        await ctx.db.patch(args.eventId, {
            registrationCount: event.registrationCount + 1,
        });

        return registrationId;
    },
});

/* -------------------------------------------------------------------------- */
/* Check Registration                                                         */
/* -------------------------------------------------------------------------- */

export const checkRegistration = query({
    args: {
        eventId: v.id("events"),
    },

    handler: async(ctx, args) => {
        const user = await ctx.runQuery(
            internal.users.getCurrentUser
        );

        if (!user) {
            return null;
        }

        const registration = await ctx.db
            .query("registrations")
            .withIndex("by_event_user", (q) =>
                q
                .eq("eventId", args.eventId)
                .eq("userId", user._id)
            )
            .unique();

        if (!registration ||
            registration.status === "cancelled"
        ) {
            return null;
        }

        return registration;
    },
});

/* -------------------------------------------------------------------------- */
/* Get My Registrations / Tickets                                             */
/* -------------------------------------------------------------------------- */

export const getMyRegistrations = query({
    handler: async(ctx) => {
        const user = await ctx.runQuery(
            internal.users.getCurrentUser
        );

        if (!user) {
            return [];
        }

        const registrations = await ctx.db
            .query("registrations")
            .withIndex("by_user", (q) =>
                q.eq("userId", user._id)
            )
            .order("desc")
            .collect();

        /*
         * Keep confirmed registrations as active tickets.
         *
         * Cancelled registrations are not returned here.
         */
        const activeRegistrations = registrations.filter(
            (registration) =>
            registration.status === "confirmed"
        );

        const registrationsWithEvents =
            await Promise.all(
                activeRegistrations.map(
                    async(registration) => {
                        const event = await ctx.db.get(
                            registration.eventId
                        );

                        return {
                            ...registration,
                            event,
                        };
                    }
                )
            );

        /*
         * Remove registrations whose event no longer exists.
         */
        return registrationsWithEvents.filter(
            (registration) =>
            registration.event !== null
        );
    },
});

/* -------------------------------------------------------------------------- */
/* Cancel Registration                                                        */
/* -------------------------------------------------------------------------- */

export const cancelRegistration = mutation({
    args: {
        registrationId: v.id("registrations"),
    },

    handler: async(ctx, args) => {
        /* ---------------------------------------------------------------------- */
        /* Authentication                                                         */
        /* ---------------------------------------------------------------------- */

        const user = await ctx.runQuery(
            internal.users.getCurrentUser
        );

        if (!user) {
            throw new Error("Please sign in.");
        }

        /* ---------------------------------------------------------------------- */
        /* Get Registration                                                       */
        /* ---------------------------------------------------------------------- */

        const registration = await ctx.db.get(
            args.registrationId
        );

        if (!registration) {
            throw new Error("Registration not found.");
        }

        /* ---------------------------------------------------------------------- */
        /* Ownership                                                              */
        /* ---------------------------------------------------------------------- */

        if (registration.userId !== user._id) {
            throw new Error(
                "You are not authorized to cancel this registration."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Already Cancelled                                                      */
        /* ---------------------------------------------------------------------- */

        if (registration.status === "cancelled") {
            return {
                success: true,
            };
        }

        /* ---------------------------------------------------------------------- */
        /* Get Event                                                              */
        /* ---------------------------------------------------------------------- */

        const event = await ctx.db.get(
            registration.eventId
        );

        if (!event) {
            throw new Error("Event not found.");
        }

        /* ---------------------------------------------------------------------- */
        /* Cancel Registration                                                    */
        /* ---------------------------------------------------------------------- */

        await ctx.db.patch(
            args.registrationId, {
                status: "cancelled",
                checkedIn: false,
                checkedInAt: undefined,
            }
        );

        /* ---------------------------------------------------------------------- */
        /* Decrement Registration Count                                           */
        /* ---------------------------------------------------------------------- */

        if (event.registrationCount > 0) {
            await ctx.db.patch(
                registration.eventId, {
                    registrationCount: event.registrationCount - 1,
                }
            );
        }

        return {
            success: true,
        };
    },
});

/* -------------------------------------------------------------------------- */
/* Get Event Registrations                                                    */
/* -------------------------------------------------------------------------- */

export const getEventRegistrations = query({
    args: {
        eventId: v.id("events"),
    },

    handler: async(ctx, args) => {
        /* ---------------------------------------------------------------------- */
        /* Authentication                                                         */
        /* ---------------------------------------------------------------------- */

        const user = await ctx.runQuery(
            internal.users.getCurrentUser
        );

        if (!user) {
            throw new Error("Please sign in.");
        }

        /* ---------------------------------------------------------------------- */
        /* Get Event                                                              */
        /* ---------------------------------------------------------------------- */

        const event = await ctx.db.get(args.eventId);

        if (!event) {
            throw new Error("Event not found.");
        }

        /* ---------------------------------------------------------------------- */
        /* Organizer Authorization                                               */
        /* ---------------------------------------------------------------------- */

        if (event.organizerId !== user._id) {
            throw new Error(
                "You are not authorized to view registrations."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Get Registrations                                                      */
        /* ---------------------------------------------------------------------- */

        const registrations = await ctx.db
            .query("registrations")
            .withIndex("by_event", (q) =>
                q.eq("eventId", args.eventId)
            )
            .collect();

        return registrations;
    },
});

/* -------------------------------------------------------------------------- */
/* Check-In Attendee                                                          */
/* -------------------------------------------------------------------------- */

export const checkInAttendee = mutation({
    args: {
        qrCode: v.string(),
    },

    handler: async(ctx, args) => {
        /* ---------------------------------------------------------------------- */
        /* Authentication                                                         */
        /* ---------------------------------------------------------------------- */

        const user = await ctx.runQuery(
            internal.users.getCurrentUser
        );

        if (!user) {
            throw new Error("Please sign in.");
        }

        const qrCode = args.qrCode.trim();

        if (!qrCode) {
            throw new Error("QR code is required.");
        }

        /* ---------------------------------------------------------------------- */
        /* Find Registration                                                      */
        /* ---------------------------------------------------------------------- */

        const registration = await ctx.db
            .query("registrations")
            .withIndex("by_qr_code", (q) =>
                q.eq("qrCode", qrCode)
            )
            .unique();

        if (!registration) {
            throw new Error("Invalid QR code.");
        }

        /* ---------------------------------------------------------------------- */
        /* Registration Status                                                    */
        /* ---------------------------------------------------------------------- */

        if (registration.status !== "confirmed") {
            throw new Error(
                "This ticket has been cancelled."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Get Event                                                              */
        /* ---------------------------------------------------------------------- */

        const event = await ctx.db.get(
            registration.eventId
        );

        if (!event) {
            throw new Error("Event not found.");
        }

        /* ---------------------------------------------------------------------- */
        /* Organizer Authorization                                                */
        /* ---------------------------------------------------------------------- */

        if (event.organizerId !== user._id) {
            throw new Error(
                "You are not authorized to check in attendees."
            );
        }

        /* ---------------------------------------------------------------------- */
        /* Already Checked In                                                     */
        /* ---------------------------------------------------------------------- */

        if (registration.checkedIn) {
            return {
                success: false,
                message: "Already checked in.",
                registration,
            };
        }

        /* ---------------------------------------------------------------------- */
        /* Check In                                                               */
        /* ---------------------------------------------------------------------- */

        const checkedInAt = Date.now();

        await ctx.db.patch(
            registration._id, {
                checkedIn: true,
                checkedInAt,
            }
        );

        return {
            success: true,
            message: "Check-in successful.",
            registration: {
                ...registration,
                checkedIn: true,
                checkedInAt,
            },
        };
    },
});