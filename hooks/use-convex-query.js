import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/* Convex Query                                                               */
/* -------------------------------------------------------------------------- */

export const useConvexQuery = (
    query,
    ...args
) => {
    const result = useQuery(
        query,
        ...args
    );

    return {
        data: result,
        isLoading: result === undefined,
        error: null,
    };
};

/* -------------------------------------------------------------------------- */
/* Convex Mutation                                                            */
/* -------------------------------------------------------------------------- */

export const useConvexMutation = (
    mutation
) => {
    const mutationFunction =
        useMutation(mutation);

    const [
        data,
        setData,
    ] = useState(undefined);

    const [
        isLoading,
        setIsLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState(null);

    const mutate = async(
        ...args
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            const response =
                await mutationFunction(
                    ...args
                );

            setData(response);

            return response;
        } catch (err) {
            setError(err);

            const message =
                err &&
                typeof err.message ===
                "string" ?
                err.message :
                "Something went wrong.";

            toast.error(message);

            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        mutate,
        data,
        isLoading,
        error,
    };
};