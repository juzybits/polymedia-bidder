import { useAppContext } from "../App";
import { useFetchAndPaginate } from "../lib/useFetch";
import { Btn } from "./Btn";

export const BtnPrevNext: React.FC<{
    data: ReturnType<typeof useFetchAndPaginate>
}> = ({
    data,
}) =>
{
    if (!data.hasMultiplePages) {
        return null;
    }
    return (
    <div className="btn-prev-next">
        <Btn
            disabled={data.isLoading || data.isFirstPage}
            onClick={data.goToPreviousPage}
        >
            PREV
        </Btn>
        <Btn
            disabled={data.isLoading || (data.isLastPage && !data.hasNextPage)}
            working={data.isLoading}
            onClick={data.goToNextPage}
        >
            NEXT
        </Btn>
    </div>)
};
