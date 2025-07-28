import { createCoin, createMetadataBuilder, createZoraUploaderForCreator, DeployCurrency, setApiKey, ValidMetadataURI } from "@zoralabs/coins-sdk";
import { Hex, createWalletClient, createPublicClient, http, Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const BASE_RPC_URL = process.env.BASE_RPC_URL??'https://base-mainnet.g.alchemy.com/v2/JjHVPY8cFHr0LZ1QbN1oZmpHDz8BSNp9';
// Set up viem clients
const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

const deployerAccount = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex);
const walletClient = createWalletClient({
  account: deployerAccount,
  chain: base,
  transport: http(BASE_RPC_URL),
});

// Define coin parameters interface
interface CoinParams {
  name: string;
  symbol: string;
  uri: ValidMetadataURI;
  payoutRecipient: Address;
  platformReferrer?: Address; // Optional
  chainId?: number; // Optional: defaults to base.id
  currency?: DeployCurrency; // Optional: ZORA or ETH
}
setApiKey(process.env.ZORA_API_KEY);
// Create the coin
export async function createMyCoin(coinParams: CoinParams, pngBuffer: Buffer) {
  try {

    const { createMetadataParameters } = await createMetadataBuilder()
    .withName(coinParams.name)
    .withSymbol(coinParams.symbol)
    .withDescription(coinParams.name)
    .withImage(new File([new Uint8Array(pngBuffer)], 'file.png', { type: "image/png" }))
    .upload(createZoraUploaderForCreator( coinParams.payoutRecipient as Address));
 

    const result = await createCoin({
        ...createMetadataParameters,
        payoutRecipient: coinParams.payoutRecipient,
        platformReferrer: coinParams.platformReferrer,
        chainId: coinParams.chainId,
        currency: coinParams.currency,
    }, walletClient, publicClient, {
      gasMultiplier: 120, // Optional: Add 20% buffer to gas (defaults to 100%)
      // account: customAccount, // Optional: Override the wallet client account
    });
    
    console.log("Transaction hash:", result.hash);
    console.log("Coin address:", result.address);
    console.log("Deployment details:", result.deployment);
    
    return result;
  } catch (error) {
    console.error("Error creating coin:", error);
    throw error;
  }
}
