import React, { useRef, useEffect } from "react";
import { useClickOutside } from "@polymedia/suitcase-react";
import { IconClose } from "./icons";

export const Modal: React.FC<{
    onClose: () => void;
    children: React.ReactNode;
}> = ({
    onClose,
    children,
}) => {
    const modalContentRef = useRef<HTMLDivElement>(null);

    useClickOutside(modalContentRef, onClose);

    useEffect(() =>
    {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleEscapeKey);

        return () => {
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, [onClose]);

    return (
        <div className="modal-background">
            <div className="card modal-content" ref={modalContentRef}>
                <div className="modal-scrollable-content">
                    {children}
                </div>
                <IconClose className="icon modal-close" onClick={onClose} />
            </div>
        </div>
    );
};
