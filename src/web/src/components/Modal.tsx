import React from "react";
import { IconClose } from "./icons";

export const Modal: React.FC<{
    children: React.ReactNode;
    onClose: () => void;
}> = ({
    children,
    onClose,
}) => {
    return (
        <div className="modal-background">
            <div className="modal-content">
                <div className="modal-close">
                    <IconClose onClick={onClose} />
                </div>
                {children}
            </div>
        </div>
    );
};
