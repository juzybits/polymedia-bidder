import React, { useRef } from "react";
import { useClickOutside } from "@polymedia/suitcase-react";
import { IconClose } from "./icons";

export const Modal: React.FC<{
    children: React.ReactNode;
    onClose: () => void;
}> = ({
    children,
    onClose,
}) => {
    const modalContentRef = useRef<HTMLDivElement>(null);

    useClickOutside(modalContentRef, onClose);

    return (
        <div className="modal-background">
            <div className="modal-content" ref={modalContentRef}>
                <div className="modal-close">
                    <IconClose onClick={onClose} />
                </div>
                {children}
            </div>
        </div>
    );
};
