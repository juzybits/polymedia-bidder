import { useAppContext } from "../App";

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
    const { isWorking } = useAppContext();
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
