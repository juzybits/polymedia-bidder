import { useOutletContext } from "react-router-dom";
import { AppContext } from "../App";

export const Btn: React.FC<{
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
}> = ({
    onClick,
    disabled,
    children,
}) =>
{
    const { isWorking } = useOutletContext<AppContext>();

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
