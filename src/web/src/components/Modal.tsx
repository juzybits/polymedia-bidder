import React from "react";

export const Modal: React.FC<{
    children: React.ReactNode;
}> = ({
    children,
}) =>
{
    return (
        <div className="modal-background">
            <div className="modal-content">
                {children}
            </div>
        </div>
    );
};
