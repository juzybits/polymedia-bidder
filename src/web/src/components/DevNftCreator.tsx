import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { NetworkName } from "@polymedia/suitcase-core";
import { useState } from "react";
import { useAppContext } from "../App";
import { getRandomDarkColor, getRandomLightColor, makeDisplaySvg, svgToDataUrl, trimSvg } from "../lib/svg";
import { SubmitRes } from "../lib/types";
import { Btn } from "./Btn";

export const DEV_PACKAGE_IDS: Record<NetworkName, string> = {
    mainnet: "",
    testnet: "",
    devnet: "",
    localnet: "",
};

const NFT_COUNT = 10;
const NFT_DESCRIPTION = "A free NFT to test the BIDDER app";

const getRandomNftName = () => {
    return "Dev NFT #" + (Math.floor(Math.random() * 9000) + 1000);
};

const getNftSvgDataUrl = (): string =>
{
    const svgRaw = makeDisplaySvg({
        titleText: "{name}",
        textColor: getRandomLightColor(),
        backgroundColor: getRandomDarkColor(),
        titleFontSize: "150px",
    });

    const svgTrimmed = trimSvg(svgRaw);
    const svgDataUrl = svgToDataUrl(svgTrimmed);

    return svgDataUrl;
};

export const DevNftCreator: React.FC<{
    onNftCreated: () => void;
}> = ({
    onNftCreated,
}) =>
{
    // === state ===

    const currAcc = useCurrentAccount();

    const { bidderClient, network, isWorking, setIsWorking } = useAppContext();
    const [ createRes, setCreateRes ] = useState<SubmitRes>({ ok: null });

    // === functions ===

    const createNft = async () =>
    {
        if (!currAcc) {
            return;
        }

        try {
            setIsWorking(true);
            setCreateRes({ ok: null });

            const tx = new Transaction();
            for (let i = 0; i < NFT_COUNT; i++) {
                const [nftArg] = tx.moveCall({
                    target: `${DEV_PACKAGE_IDS[network]}::user::new_dev_nft`,
                    arguments: [
                        tx.pure.string(getRandomNftName()),
                        tx.pure.string(NFT_DESCRIPTION),
                        tx.pure.string(getNftSvgDataUrl()),
                    ],
                });
                tx.transferObjects([nftArg], currAcc.address);
            }

            const resp = await bidderClient.signAndExecuteTransaction(tx);
            if (resp.effects?.status.status !== "success") {
                throw new Error(resp.effects?.status.error);
            }

            setCreateRes({ ok: true });
            onNftCreated();
        } catch (err) {
            setCreateRes({ ok: false, err: "Failed to create NFTs" });
            console.warn("[createNft]", err);
        } finally {
            setIsWorking(false);
        }

        console.log("createNft");
    };

    // === html ===

    return <>
        <div className="card compact">
            <div className="card-title">No items? No problem!</div>
            <div className="card-description">You can create free NFTs to test the BIDDER app.</div>
            <div className="btn-submit">
                <Btn onClick={createNft}>Create {NFT_COUNT} NFTs</Btn>

                {createRes.ok === true &&
                <div className="success">NFTs created!</div>}

                {createRes.ok === false && createRes.err &&
                <div className="error">{createRes.err}</div>}
            </div>
        </div>
    </>;
};
