import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* -------------------------------------------------------------------------- */
/* Store / Update Current User                                                */
/* -------------------------------------------------------------------------- */

export const store = mutation({
    args: {},

    handler: async(ctx) => {
        const identity =
            await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error(
                "User not authenticated."
            );
        }

        const clerkId =
            identity.subject;

        if (!clerkId) {
            throw new Error(
                "Unable to identify authenticated user."
            );
        }

        const user = await ctx.db
            .query("users")
            .withIndex(
                "by_clerkId",
                (q) =>
                q.eq(
                    "clerkId",
                    clerkId
                )
            )
            .unique();

        /* ---------------------------------------------------------------------- */
        /* Existing User                                                          */
        /* ---------------------------------------------------------------------- */

        if (user) {
            const updates = {};

            const name =
                identity.name ||
                "Anonymous";

            const email =
                identity.email ||
                "";

            const imageUrl =
                identity.pictureUrl ||
                undefined;

            if (user.name !== name) {
                updates.name = name;
            }

            if (user.email !== email) {
                updates.email = email;
            }

            if (
                user.imageUrl !==
                imageUrl
            ) {
                updates.imageUrl =
                    imageUrl;
            }

            if (
                user.tokenIdentifier !==
                identity.tokenIdentifier
            ) {
                updates.tokenIdentifier =
                    identity.tokenIdentifier;
            }

            if (
                Object.keys(updates)
                .length > 0
            ) {
                updates.updatedAt =
                    Date.now();

                await ctx.db.patch(
                    user._id,
                    updates
                );
            }

            return user._id;
        }

        /* ---------------------------------------------------------------------- */
        /* New User                                                               */
        /* ---------------------------------------------------------------------- */

        return await ctx.db.insert(
            "users", {
                clerkId,

                email: identity.email || "",

                name: identity.name ||
                    "Anonymous",

                imageUrl: identity.pictureUrl ||
                    undefined,

                tokenIdentifier: identity.tokenIdentifier ||
                    undefined,

                hasCompletedOnboarding: false,

                /*
                 * Legacy field.
                 *
                 * This is NOT used to limit
                 * event creation.
                 */
                freeEventsCreated: 0,

                createdAt: Date.now(),

                updatedAt: Date.now(),
            }
        );
    },
});

/* -------------------------------------------------------------------------- */
/* Get Current User                                                           */
/* -------------------------------------------------------------------------- */

export const getCurrentUser = query({
    args: {},

    handler: async(ctx) => {
        const identity =
            await ctx.auth.getUserIdentity();

        if (!identity) {
            return null;
        }

        const clerkId =
            identity.subject;

        if (!clerkId) {
            return null;
        }

        const user = await ctx.db
            .query("users")
            .withIndex(
                "by_clerkId",
                (q) =>
                q.eq(
                    "clerkId",
                    clerkId
                )
            )
            .unique();

        return user || null;
    },
});

/* -------------------------------------------------------------------------- */
/* Complete Onboarding                                                        */
/* -------------------------------------------------------------------------- */

export const completeOnboarding =
    mutation({
        args: {
            location: v.object({
                city: v.string(),
                state: v.optional(
                    v.string()
                ),
                country: v.string(),
            }),

            interests: v.array(
                v.string()
            ),
        },

        handler: async(
            ctx,
            args
        ) => {
            const identity =
                await ctx.auth.getUserIdentity();

            if (!identity) {
                throw new Error(
                    "User not authenticated."
                );
            }

            const clerkId =
                identity.subject;

            if (!clerkId) {
                throw new Error(
                    "Unable to identify authenticated user."
                );
            }

            const user =
                await ctx.db
                .query("users")
                .withIndex(
                    "by_clerkId",
                    (q) =>
                    q.eq(
                        "clerkId",
                        clerkId
                    )
                )
                .unique();

            if (!user) {
                throw new Error(
                    "User not found."
                );
            }

            await ctx.db.patch(
                user._id, {
                    location: args.location,

                    interests: args.interests,

                    hasCompletedOnboarding: true,

                    updatedAt: Date.now(),
                }
            );

            return user._id;
        },
    });