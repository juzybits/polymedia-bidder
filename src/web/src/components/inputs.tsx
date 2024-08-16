// TODO: move to @polymedia/suitcase-core

import { balanceToString, stringToBalance } from "@polymedia/suitcase-core";
import React, { useCallback, useEffect, useState } from "react";

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
            {...props}
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
    const pattern = "^[0-9]*$";

    const validate = (val: string): string | undefined =>
    {
        const numValue = Number(val);

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
            pattern={pattern}
            {...props}
        />
    );
};

export const InputUnsignedBalance: React.FC<CommonInputProps & {
    decimals: number;
    min?: bigint;
    max?: bigint;
    msgTooSmall?: string;
    msgTooLarge?: string;
}> = (
    props,
) =>
{
    const pattern = `^[0-9]*\\.?[0-9]{0,${props.decimals}}$`;

    const validate = (value: string): string | undefined =>
    {
        if (value === "" || value === ".") {
            return undefined;
        }

        const bigValue = stringToBalance(value, props.decimals);

        if (props.min !== undefined && bigValue < props.min) {
            return props.msgTooSmall ?? `Minimum value is ${balanceToString(props.min, props.decimals)}`;
        }
        if (props.max !== undefined && bigValue > props.max) {
            return props.msgTooLarge ?? `Maximum value is ${balanceToString(props.max, props.decimals)}`;
        }
        return undefined;
    };
    return (
        <BaseInput
            inputType="text"
            inputMode="decimal"
            validate={validate}
            pattern={pattern}
            {...props}
        />
    );
};

export const useInputUnsignedBalance = (props : {
    // Common
    initValue?: string;
    onSubmit?: () => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    msgRequired?: string;
    // Specific
    decimals: number;
    min?: bigint;
    max?: bigint;
    msgTooSmall?: string;
    msgTooLarge?: string;
}) =>
{
    const [str, setStr] = useState<string>(props.initValue ?? "");
    const [val, setVal] = useState<bigint | undefined>();
    const [err, setErr] = useState<string | undefined>();

    const pattern = `^[0-9]*\\.?[0-9]{0,${props.decimals}}$`;

    const validate = (
        input: string,
    ): { err: string | undefined, val: bigint | undefined } =>
    {
        input = input.trim();

        if (props.required && input === "") {
            return { err: props.msgRequired ?? "Input is required", val: undefined };
        }

        if (input === "" || input === ".") {
            return { err: undefined, val: undefined };
        }

        const bigInput = stringToBalance(input, props.decimals);

        if (props.min !== undefined && bigInput < props.min) {
            return { err: props.msgTooSmall ?? `Minimum value is ${balanceToString(props.min, props.decimals)}`, val: undefined };
        }
        if (props.max !== undefined && bigInput > props.max) {
            return { err: props.msgTooLarge ?? `Maximum value is ${balanceToString(props.max, props.decimals)}`, val: undefined };
        }
        return { err: undefined, val: bigInput };
    };

    useEffect(() => {
        const validation = validate(str);
        setErr(validation.err);
        setVal(validation.val);
    }, [str]);

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        if (pattern && !new RegExp(pattern).test(e.target.value)) {
            return;
        } else {
            setStr(e.target.value);
        }
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) =>
    {
        if (e.key === "Enter" && props.onSubmit && !err) {
            props.onSubmit();
        }
    };

    const input =
        <div className="poly-input">
            <input
                type="text"
                inputMode="decimal"
                value={str}
                pattern={pattern}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={props.placeholder}
                disabled={props.disabled}
                required={props.required}
            />
            {err && <div className="input-error">{err}</div>}
        </div>;

        return { str, val, err, input };
};
