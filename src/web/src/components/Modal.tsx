import React, { useRef, useEffect } from "react";
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
            <div className="modal-content" ref={modalContentRef}>
                <div className="modal-close">
                    <IconClose onClick={onClose} />
                </div>
                {children}
            </div>
        </div>
    );
};
