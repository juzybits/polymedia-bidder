// TODO: move to @polymedia/suitcase-core

import React from "react";

export const Btn: React.FC<{
    children: React.ReactNode;
    id?: string;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
}> = ({
    children,
    id = undefined,
    className = "btn",
    disabled = false,
    onClick = undefined,
}) => {
    return (
    <button
        id={id}
        className={className}
        disabled={disabled}
        onClick={() => { !disabled && onClick && onClick(); }}
    >
        {children}
    </button>
    );
};
