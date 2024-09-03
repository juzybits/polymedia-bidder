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
    const { inProgress } = useOutletContext<AppContext>();

    return (
        <button
            onClick={onClick}
            className={`btn ${inProgress ? "loading" : ""}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
};
