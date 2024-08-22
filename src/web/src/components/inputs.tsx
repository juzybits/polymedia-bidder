// TODO: move to @polymedia/suitcase-react

import { balanceToString, stringToBalance } from "@polymedia/suitcase-core";
import React, { useEffect, useState } from "react";

export type CommonInputProps<T> = {
    html?: React.InputHTMLAttributes<HTMLInputElement>,
    label?: string;
    initVal?: string;
    msgRequired?: string;
    onChangeVal?: (val: T | undefined) => void;
};

export type InputReturn<T> = {
    str: string;
    val: T | undefined;
    err: string | undefined;
    input: JSX.Element;
};

export type InputValidator<T> = (input: string) => {
    err: string | undefined;
    val: T | undefined;
};

export const useInputBase = <T,>(props: CommonInputProps<T> & {
    validate: InputValidator<T>;
}): InputReturn<T> =>
{
    const [str, setStr] = useState<string>(props.initVal ?? "");
    const [val, setVal] = useState<T | undefined>();
    const [err, setErr] = useState<string | undefined>();

    const html = props.html ?? {};

    const validate: InputValidator<T> = (input: string) =>
    {
        input = input.trim();
        if (html.required && input === "") {
            return { err: props.msgRequired ?? "Input is required", val: undefined };
        }
        return props.validate(input);
    };

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        if (html.pattern && !new RegExp(html.pattern).test(e.target.value)) {
            return;
        }

        setStr(e.target.value);
        const validation = validate(str);
        setErr(validation.err);
        setVal(validation.val);

        if (html.onChange) {
            html.onChange(e);
        }
    };

    useEffect(() => {
        if (props.onChangeVal) {
            props.onChangeVal(val);
        }
    }, [val]);

    const input = (
        <div className="poly-input">

            {props.label &&
            <div className="input-label">{props.label}</div>}

            <input className="input"
                {...html}
                onChange={onChange}
                value={str}
            />

            {err &&
            <div className="input-error">{err}</div>}

        </div>
    );

    return { str, val, err, input };
};

export const useInputString = (props : CommonInputProps<string> & {
    minLength?: number;
    maxLength?: number;
    minBytes?: number;
    maxBytes?: number;
    msgTooShort?: string;
    msgTooLong?: string;
}): InputReturn<string> =>
{
    const html = props.html ?? {};
    html.type = "text";
    html.inputMode = "text";
    html.pattern = undefined;

    const textEncoder = new TextEncoder();
    const validate: InputValidator<string> = (input: string) =>
    {
        if (props.minLength && input.length > 0 && input.length < props.minLength) {
            return { err: props.msgTooShort ?? `Minimum length is ${props.minLength} characters`, val: undefined };
        }
        if (props.maxLength && input.length > 0 && input.length > props.maxLength) {
            return { err: props.msgTooLong ?? `Maximum length is ${props.maxLength} characters`, val: undefined };
        }

        if (props.minBytes && input.length > 0 && textEncoder.encode(input).length < props.minBytes) {
            return { err: props.msgTooShort ?? `Minimum length is ${props.minBytes} bytes`, val: undefined };
        }
        if (props.maxBytes && input.length > 0 && textEncoder.encode(input).length > props.maxBytes) {
            return { err: props.msgTooLong ?? `Maximum length is ${props.maxBytes} bytes`, val: undefined };
        }

        return { err: undefined, val: input };
    };

    return useInputBase<string>({
        html,
        validate,
        ...props,
    });
};

export const useInputUnsignedInt = (props : CommonInputProps<number> & {
    min?: number;
    max?: number;
    msgTooSmall?: string;
    msgTooLarge?: string;
}): InputReturn<number> =>
{
    const html = props.html ?? {};
    html.type = "text";
    html.inputMode = "numeric";
    html.pattern = "^[0-9]*$";

    const validate: InputValidator<number> = (input: string) =>
    {
        if (input === "") {
            return { err: undefined, val: undefined };
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
        html,
        validate,
        ...props,
    });
};

export const useInputUnsignedBalance = (props : CommonInputProps<bigint> & {
    decimals: number;
    min?: bigint;
    max?: bigint;
    msgTooSmall?: string;
    msgTooLarge?: string;
}): InputReturn<bigint> =>
{
    const html = props.html ?? {};
    html.type = "text";
    html.inputMode = "decimal";
    html.pattern = `^[0-9]*\\.?[0-9]{0,${props.decimals}}$`;

    const validate: InputValidator<bigint> = (input: string) =>
    {
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

    return useInputBase<bigint>({
        html,
        validate,
        ...props,
    });
};
