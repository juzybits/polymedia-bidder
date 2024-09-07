import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const Btn: React.FC<{
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}> = ({
    onClick,
    children,
    disabled = undefined,
}) =>
{
    const { isWorking } = useOutletContext<AppContext>();
    disabled = disabled || isWorking;

    return (
        <button
            onClick={onClick}
            className={`btn ${isWorking ? "working" : ""}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
};
