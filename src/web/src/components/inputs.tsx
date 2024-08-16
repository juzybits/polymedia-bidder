// TODO: move to @polymedia/suitcase-core

import { balanceToString, stringToBalance } from "@polymedia/suitcase-core";
import React, { useCallback, useEffect, useState } from "react";

export const useInputString = (props : {
    // Common
    label?: string;
    initValue?: string;
    onSubmit?: () => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    msgRequired?: string;
    // Specific
    minLength?: number;
    maxLength?: number;
    msgTooShort?: string;
    msgTooLong?: string;
}) =>
{
    const [str, setStr] = useState<string>(props.initValue ?? "");
    const [val, setVal] = useState<string | undefined>();
    const [err, setErr] = useState<string | undefined>();

    const validate = (
        input: string,
    ): { err: string | undefined, val: string | undefined } =>
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

    useEffect(() => {
        const validation = validate(str);
        setErr(validation.err);
        setVal(validation.val);
    }, [str]);

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        setStr(e.target.value);
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) =>
    {
        if (e.key === "Enter" && props.onSubmit && !err) {
            props.onSubmit();
        }
    };

    const input =
        <div className="poly-input">

            {props.label &&
            <div className="input-label">{props.label}</div>}

            <input className="input"
                type="text"
                inputMode="text"
                value={str}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={props.placeholder}
                disabled={props.disabled}
                required={props.required}
            />

            {err &&
            <div className="input-error">{err}</div>}
        </div>;

        return { str, val, err, input };
};

export const useInputUnsignedInt = (props : {
    // Common
    label?: string;
    initValue?: string;
    onSubmit?: () => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    msgRequired?: string;
    // Specific
    min?: number;
    max?: number;
    msgTooSmall?: string;
    msgTooLarge?: string;
}) =>
{
    const [str, setStr] = useState<string>(props.initValue ?? "");
    const [val, setVal] = useState<number | undefined>();
    const [err, setErr] = useState<string | undefined>();

    const pattern = "^[0-9]*$";

    const validate = (
        input: string,
    ): { err: string | undefined, val: number | undefined } =>
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

            {props.label &&
            <div className="input-label">{props.label}</div>}

            <input className="input"
                type="text"
                inputMode="numeric"
                value={str}
                pattern={pattern}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={props.placeholder}
                disabled={props.disabled}
                required={props.required}
            />

            {err &&
            <div className="input-error">{err}</div>}
        </div>;

        return { str, val, err, input };
};

export const useInputUnsignedBalance = (props : {
    // Common
    label?: string;
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

            {props.label &&
            <div className="input-label">{props.label}</div>}

            <input className="input"
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

            {err &&
            <div className="input-error">{err}</div>}
        </div>;

        return { str, val, err, input };
};
