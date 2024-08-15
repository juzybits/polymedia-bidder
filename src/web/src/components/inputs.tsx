// TODO: move to @polymedia/suitcase-core

import React, { useState, useEffect, useCallback } from "react";

export type InputError = string | undefined;

export type InputErrors = { [inputName: string]: InputError };

export const useInputValidation = () =>
{
    const [errors, setErrors] = useState<InputErrors>({});

    const onValidate = useCallback(
        (inputName: string) => (error: string | undefined) => {
            setErrors((prevErrors) => ({
                ...prevErrors,
                [inputName]: error,
            }));
        },
        [],
    );

    const hasErrors = useCallback(() => {
        return Object.values(errors).some((error) => error !== undefined);
    }, [errors]);

    return {
        errors,
        onValidate,
        hasErrors,
    };
};


export const BaseInput: React.FC<{
    inputType: React.HTMLInputTypeAttribute;
    inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    val: string;
    setVal: React.Dispatch<React.SetStateAction<string>>;
    onSubmit?: () => void;
    onValidate?: (error: string | undefined) => void;
    validate?: (value: string) => string | undefined;
    pattern?: string;
    disabled?: boolean;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    placeholder?: string;
    msgRequired?: string;
    msgTooShort?: string;
    msgTooLong?: string;
}> = ({
    inputType,
    inputMode,
    val,
    setVal,
    onSubmit = undefined,
    onValidate = undefined,
    validate = undefined,
    pattern = undefined,
    disabled = false,
    required = false,
    minLength = undefined,
    maxLength = undefined,
    placeholder = "",
    msgRequired = "Input is required",
    msgTooShort = `Minimum length is ${minLength}`,
    msgTooLong = `Maximum length is ${maxLength}`,
}) => {
    const [err, setErr] = useState<string | undefined>();

    const runValidation = (value: string) => {
        let validationError: string | undefined;

        if (validate) {
            validationError = validate(value);
        } else {
            if (required && value.trim() === "") {
                validationError = msgRequired;
            } else if (minLength && value.length < minLength) {
                validationError = msgTooShort;
            } else if (maxLength && value.length > maxLength) {
                validationError = msgTooLong;
            } else if (pattern && !new RegExp(pattern).test(value)) {
                validationError = "Invalid format";
            }
        }

        return validationError;
    };

    useEffect(() => {
        const validationError = runValidation(val);
        setErr(validationError);
        if (onValidate) {
            onValidate(validationError);
        }
    }, [val]);

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        setVal(e.target.value);
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter" && onSubmit && !err) {
            onSubmit();
        }
    };

    return (
        <div className="poly-input">
            <input
                className="input"
                type={inputType}
                inputMode={inputMode}
                value={val}
                required={required}
                minLength={minLength}
                maxLength={maxLength}
                disabled={disabled}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                pattern={pattern}
            />
            {err && <div className="input-error">{err}</div>}
        </div>
    );
};

export const InputString: React.FC<{
    val: string;
    setVal: React.Dispatch<React.SetStateAction<string>>;
    onSubmit?: () => void;
    onValidate?: (error: string | undefined) => void;
    disabled?: boolean;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    placeholder?: string;
    msgRequired?: string;
    msgTooShort?: string;
    msgTooLong?: string;
}> = ({
    val,
    setVal,
    disabled = false,
    required = false,
    minLength,
    maxLength,
    onSubmit,
    onValidate,
    placeholder = "",
    msgRequired,
    msgTooShort,
    msgTooLong,
}) => {
    return (
        <BaseInput
            inputType="text"
            inputMode="text"
            val={val}
            setVal={setVal}
            onSubmit={onSubmit}
            onValidate={onValidate}
            disabled={disabled}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            placeholder={placeholder}
            msgRequired={msgRequired}
            msgTooShort={msgTooShort}
            msgTooLong={msgTooLong}
        />
    );
};

export const InputUnsignedInt: React.FC<{
    val: string;
    setVal: React.Dispatch<React.SetStateAction<string>>;
    onSubmit?: () => void;
    onValidate?: (error: string | undefined) => void;
    disabled?: boolean;
    required?: boolean;
    min?: number;
    max?: number;
    placeholder?: string;
    msgRequired?: string;
    msgInvalid?: string;
}> = ({
    val,
    setVal,
    onSubmit,
    onValidate,
    disabled = false,
    required = false,
    min,
    max,
    placeholder = "",
    msgRequired,
    msgInvalid,
}) => {
    const validateUnsignedInt = (value: string) => {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0
            || (min !== undefined && numValue < min)
            || (max !== undefined && numValue > max))
        {
            return msgInvalid ?? `Invalid number`;
        }
        return undefined;
    };

    return (
        <BaseInput
            inputType="text"
            inputMode="numeric"
            val={val}
            setVal={setVal}
            onSubmit={onSubmit}
            validate={validateUnsignedInt}
            onValidate={onValidate}
            pattern="^[0-9]*$"
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            msgRequired={msgRequired}
        />
    );
};
