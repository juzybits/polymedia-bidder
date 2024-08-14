 // TODO: move to @polymedia/suitcase-react

import { useState } from "react";

export const InputUnsignedInt: React.FC<{
    valStr: string;
    setValStr: React.Dispatch<React.SetStateAction<string>>;
    minValue?: number;
    maxValue?: number;
    disabled?: boolean;
    onSubmit?: () => void;
    placeholder?: string;
    msgTooSmall?: string;
    msgTooLarge?: string;
}> = ({
    valStr,
    setValStr,
    minValue = undefined,
    maxValue = undefined,
    disabled = false,
    onSubmit = undefined,
    placeholder = "enter amount",
    msgTooSmall,
    msgTooLarge,
}) => {
    const valErr = (() => {
        if (valStr.trim() === "") {
            return "";
        }
        const valInt = parseInt(valStr);
        if (minValue !== undefined && valInt < minValue) {
            return msgTooSmall ?? `Minimum value is ${minValue}`;
        }
        if (maxValue !== undefined && valInt > maxValue) {
            return msgTooLarge ?? `Maximum value is ${maxValue}`;
        }
        return "";
    })();

    const disableSubmit = valStr.trim() === "" || valErr !== "" || !onSubmit;

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        if (e.target.validity.valid) {
            setValStr(e.target.value);
        }
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (!disableSubmit && onSubmit && e.key === "Enter") {
            onSubmit();
        }
    };

    return (
    <div className="poly-input">
        <input
            className="input-number"
            type="text"
            inputMode="numeric"
            pattern={"^[0-9]*$"}
            value={valStr}
            disabled={disabled}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
        />
        {valErr && <div className="input-error">{valErr}</div>}
    </div>
    );
};

export const InputString: React.FC<{
    valStr: string;
    setValStr: React.Dispatch<React.SetStateAction<string>>;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    disabled?: boolean;
    onSubmit?: () => void;
    placeholder?: string;
    msgRequired?: string;
    msgTooShort?: string;
    msgTooLong?: string;
}> = ({
    valStr,
    setValStr,
    required = false,
    minLength = undefined,
    maxLength = undefined,
    disabled = false,
    onSubmit = undefined,
    placeholder = "enter amount",
    msgRequired = undefined,
    msgTooShort = undefined,
    msgTooLong = undefined,
}) =>
{
    const [ err, setErr ] = useState<string>();

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) =>
    {
        setValStr(e.target.value);
        if (e.target.validity.valueMissing) {
            setErr(msgRequired ?? `Input is required`);
        }
        else if (e.target.validity.tooShort) {
            setErr(msgTooShort ?? `Minimum length is ${minLength}`);
        }
        else if (e.target.validity.tooLong) {
            setErr(msgTooLong ?? `Maximum length is ${maxLength}`);
        }
        else  {
            setErr(undefined);
        }
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
        if (e.key === "Enter" && onSubmit && err === undefined) {
            onSubmit();
        }
    };

    return (
    <div className="poly-input">
        <input
            className="input-string"
            type="text"
            inputMode="text"
            value={valStr}
            required={required}
            minLength={minLength}
            maxLength={maxLength}
            disabled={disabled}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
        />
        {err && <div className="input-error">{err}</div>}
    </div>
    );
};
