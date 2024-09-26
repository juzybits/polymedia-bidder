import { useAppContext } from "../App";
import { useFetchAndPaginate } from "../lib/useFetch";
import { Btn } from "./Btn";

export const BtnPrevNext: React.FC<{
    data: ReturnType<typeof useFetchAndPaginate>;
    onPageChange?: () => void;
}> = ({
    data,
    onPageChange
}) =>
{
    if (!data.hasMultiplePages) {
        return null;
    }

    const handlePrevClick = () => {
        data.goToPreviousPage();
        onPageChange?.();
    };

    const handleNextClick = () => {
        data.goToNextPage();
        onPageChange?.();
    };

    return (
        <div className="btn-prev-next">
            <Btn
                disabled={data.isLoading || data.isFirstPage}
                onClick={handlePrevClick}
            >
                PREV
            </Btn>
            <Btn
                disabled={data.isLoading || (data.isLastPage && !data.hasNextPage)}
                working={data.isLoading}
                onClick={handleNextClick}
            >
                NEXT
            </Btn>
        </div>
    );
};
