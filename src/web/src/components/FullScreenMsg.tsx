import React from "react";

export const FullScreenMsg: React.FC<{
    children: React.ReactNode;
}> = ({
    children,
}) => {
    return (
        <div className="full-screen-msg">
            <div className="msg">
                {children}
            </div>
        </div>
    );
};
