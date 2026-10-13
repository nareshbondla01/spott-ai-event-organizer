import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
    args: {},
    handler: async(ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Please log in first.");
        }

        return await ctx.storage.generateUploadUrl();
    },
});

export const getStorageUrl = query({
    args: {
        storageId: v.id("_storage"),
    },
    handler: async(ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});