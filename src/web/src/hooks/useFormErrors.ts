import { useState, useCallback } from "react";

export type FormErrors = { [key: string]: string | undefined };

export const useFormErrors = () =>
{
    const [errors, setErrors] = useState<FormErrors>({});

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
