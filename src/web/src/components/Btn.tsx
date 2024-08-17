// TODO: move to @polymedia/suitcase-react

import React from "react";

export const Btn: React.FC<{
    children: React.ReactNode;
    onClick: () => void;
    id?: string;
    className?: string;
    disabled?: boolean;
}> = ({
    children,
    onClick,
    id = undefined,
    className = "btn",
    disabled = false,
}) => {
    return (
    <button
        id={id}
        className={className}
        disabled={disabled}
        onClick={() => { !disabled && onClick(); }}
    >
        {children}
    </button>
    );
};
