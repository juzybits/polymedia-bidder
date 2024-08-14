import React, { useState } from "react";

export const BaseInput: React.FC<{
    inputType: React.HTMLInputTypeAttribute;
    inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    val: string;
    setVal: React.Dispatch<React.SetStateAction<string>>;
    onSubmit?: () => void;
    validate?: (value: string) => string | undefined;
    onError?: (error: string | undefined) => void;
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
    validate = undefined,
    onError = undefined,
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

    const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const val = e.target.value;
        setVal(val);

        let validationError: string | undefined;

        if (validate) {
            validationError = validate(val);
        } else {
            if (e.target.validity.valueMissing) {
                validationError = msgRequired;
            } else if (e.target.validity.tooShort) {
                validationError = msgTooShort;
            } else if (e.target.validity.tooLong) {
                validationError = msgTooLong;
            }
        }

        if (validationError !== err) {
            setErr(validationError);
            if (onError) {
                onError(validationError);
            }
        }
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
    onError?: (error: string | undefined) => void;
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
    onError,
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
            onError={onError}
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
    onError?: (error: string | undefined) => void;
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
    onError,
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
            onError={onError}
            pattern="^[0-9]*$"
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            msgRequired={msgRequired}
        />
    );
};
