import { useState, useCallback } from "react";

export type InputErrors = { [key: string]: string | undefined };

export const useInputErrors = () =>
{
    const [errors, setErrors] = useState<InputErrors>({});

    const onError = useCallback(
        (field: string) => (error: string | undefined) => {
            setErrors((prevErrors) => ({
                ...prevErrors,
                [field]: error,
            }));
        },
        [],
    );

    const hasErrors = useCallback(() => {
        return Object.values(errors).some((error) => error !== undefined);
    }, [errors]);

    return {
        errors,
        onError,
        hasErrors,
    };
};
