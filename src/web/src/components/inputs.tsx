// TODO: move to @polymedia/suitcase-react

import { balanceToString, stringToBalance } from "@polymedia/suitcase-core";
import React, { useEffect, useState } from "react";

export type CommonInputProps = {
    label?: string;
    initVal?: string;
    onSubmit?: () => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    msgRequired?: string;
};

export type InputReturn<T> = {
    str: string;
    val: T | undefined;
    err: string | undefined;
    input: JSX.Element;
};

export const useInputBase = <T,>(props: CommonInputProps & {
    type: React.HTMLInputTypeAttribute;
    inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    pattern?: string;
    validate: (input: string) => { err: string|undefined; val: T|undefined };
}): InputReturn<T> =>
{
    const [str, setStr] = useState<string>(props.initVal ?? "");
    const [val, setVal] = useState<T | undefined>();
    const [err, setErr] = useState<string | undefined>();

    useEffect(() => {
        const validation = props.validate(str);
        setErr(validation.err);
        setVal(validation.val);
    }, [str]);

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        if (props.pattern && !new RegExp(props.pattern).test(e.target.value)) {
            return;
        }
        setStr(e.target.value);
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) =>
    {
        if (e.key === "Enter" && props.onSubmit && !err) {
            props.onSubmit();
        }
    };

    const input = (
        <div className="poly-input">

            {props.label &&
            <div className="input-label">{props.label}</div>}

            <input className="input"
                type={props.type}
                inputMode={props.inputMode}
                pattern={props.pattern}
                value={str}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={props.placeholder}
                disabled={props.disabled}
                required={props.required}
            />

            {err &&
            <div className="input-error">{err}</div>}

        </div>
    );

    return { str, val, err, input };
};

export const useInputString = (props : CommonInputProps & {
    minLength?: number;
    maxLength?: number;
    msgTooShort?: string;
    msgTooLong?: string;
}): InputReturn<string> =>
{
    const pattern = undefined;

    const validate = (
        input: string,
    ): { err: string | undefined; val: string | undefined } =>
    {
        input = input.trim();

        if (props.required && input === "") {
            return { err: props.msgRequired ?? "Input is required", val: undefined };
        }

        if (props.minLength && input.length < props.minLength) {
            return { err: props.msgTooShort ?? `Minimum length is ${props.minLength}`, val: undefined };
        }
        if (props.maxLength && input.length > props.maxLength) {
            return { err: props.msgTooLong ?? `Maximum length is ${props.maxLength}`, val: undefined };
        }

        return { err: undefined, val: input };
    };

    return useInputBase<string>({
        type: "text",
        inputMode: "text",
        pattern,
        validate,
        ...props,
    });
};

export const useInputUnsignedInt = (props : CommonInputProps & {
    min?: number;
    max?: number;
    msgTooSmall?: string;
    msgTooLarge?: string;
}): InputReturn<number> =>
{
    const pattern = "^[0-9]*$";

    const validate = (
        input: string,
    ): { err: string | undefined; val: number | undefined } =>
    {
        input = input.trim();

        if (props.required && input === "") {
            return { err: props.msgRequired ?? "Input is required", val: undefined };
        }

        const numValue = Number(input);

        if (isNaN(numValue) || numValue < 0) {
            return { err: "Invalid number", val: undefined };
        }
        if (props.min !== undefined && numValue < props.min) {
            return { err: props.msgTooSmall ?? `Minimum value is ${props.min}`, val: undefined };
        }
        if (props.max !== undefined && numValue > props.max) {
            return { err: props.msgTooLarge ?? `Maximum value is ${props.max}`, val: undefined };
        }
        if (numValue > Number.MAX_SAFE_INTEGER) {
            return { err: "Number is too large", val: undefined };
        }
        return { err: undefined, val: numValue };
    };

    return useInputBase<number>({
        type: "text",
        inputMode: "numeric",
        pattern,
        validate,
        ...props,
    });
};

export const useInputUnsignedBalance = (props : CommonInputProps & {
    decimals: number;
    min?: bigint;
    max?: bigint;
    msgTooSmall?: string;
    msgTooLarge?: string;
}): InputReturn<bigint> =>
{
    const pattern = `^[0-9]*\\.?[0-9]{0,${props.decimals}}$`;

    const validate = (
        input: string,
    ): { err: string | undefined; val: bigint | undefined } =>
    {
        input = input.trim();

        if (props.required && input === "") {
            return { err: props.msgRequired ?? "Input is required", val: undefined };
        }

        if (input === "" || input === ".") {
            return { err: undefined, val: 0n };
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

    return useInputBase<bigint>({
        type: "text",
        inputMode: "decimal",
        pattern,
        validate,
        ...props,
    });
};
