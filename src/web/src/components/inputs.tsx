// TODO: move to @polymedia/suitcase-core

import React, { useState, useEffect, useCallback } from "react";

export type InputError = string | undefined;

export type InputErrors = Record<string, InputError>;

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

export type CommonInputProps = {
    val: string;
    setVal: React.Dispatch<React.SetStateAction<string>>;
    onSubmit?: () => void;
    onValidate?: (error: string | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    msgRequired?: string;
};

export const BaseInput: React.FC<CommonInputProps & {
    inputType: React.HTMLInputTypeAttribute;
    inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    validate?: (value: string) => string | undefined;
    pattern?: string;
}> = ({
    inputType,
    inputMode,
    validate = undefined,
    pattern = undefined,
    // Common props
    val,
    setVal,
    onSubmit = undefined,
    onValidate = undefined,
    placeholder = undefined,
    disabled = false,
    required = false,
    msgRequired = "Input is required",
}) =>
{
    const [err, setErr] = useState<string | undefined>();

    const runValidation = (val: string): string | undefined =>
    {
        if (required && val.trim() === "") {
            return msgRequired;
        }
        if (validate !== undefined) {
            return validate(val);
        }
        return undefined;
    };

    useEffect(() => {
        const validationError = runValidation(val);
        setErr(validationError);
        if (onValidate) {
            onValidate(validationError);
        }
    }, [val]);

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        if (pattern && !new RegExp(pattern).test(e.target.value)) {
            return;
        } else {
            setVal(e.target.value);
        }
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) =>
    {
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

export const InputString: React.FC<CommonInputProps & {
    minLength?: number;
    maxLength?: number;
    msgTooShort?: string;
    msgTooLong?: string;
}> = (
    props,
) => {
    const validate = (val: string): string | undefined =>
    {
        if (props.minLength && val.length < props.minLength) {
            return props.msgTooShort ?? `Minimum length is ${props.minLength}`;
        }
        if (props.maxLength && val.length > props.maxLength) {
            return props.msgTooLong ?? `Maximum length is ${props.maxLength}`;
        }
        return undefined;
    };
    return (
        <BaseInput
            inputType="text"
            inputMode="text"
            validate={validate}
            // Common props
            val={props.val}
            setVal={props.setVal}
            onSubmit={props.onSubmit}
            onValidate={props.onValidate}
            placeholder={props.placeholder}
            disabled={props.disabled}
            required={props.required}
            msgRequired={props.msgRequired}
        />
    );
};

export const InputUnsignedInt: React.FC<CommonInputProps & {
    min?: number;
    max?: number;
    msgTooSmall?: string;
    msgTooLarge?: string;
}> = (
    props,
) =>
{
    const validate = (value: string): string | undefined =>
    {
        const numValue = Number(value);

        if (isNaN(numValue) || numValue < 0) {
            return "Invalid number";
        }
        if (props.min !== undefined && numValue < props.min) {
            return props.msgTooSmall ?? `Minimum value is ${props.min}`;
        }
        if (props.max !== undefined && numValue > props.max) {
            return props.msgTooLarge ?? `Maximum value is ${props.max}`;
        }
        if (numValue > Number.MAX_SAFE_INTEGER) {
            return "Number is too large";
        }
        return undefined;
    };
    return (
        <BaseInput
            inputType="text"
            inputMode="numeric"
            validate={validate}
            pattern="^[0-9]*$"
            // Common props
            val={props.val}
            setVal={props.setVal}
            onSubmit={props.onSubmit}
            onValidate={props.onValidate}
            placeholder={props.placeholder}
            disabled={props.disabled}
            required={props.required}
            msgRequired={props.msgRequired}
        />
    );
};
