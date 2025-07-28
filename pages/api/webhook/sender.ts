import { genNodeAPI, getTokenTagByEver } from 'arseeding-js';
import type { DataItemCreateOptions } from 'arseeding-arbundles';
import axios from 'axios';
import { FRAMES_BASE_URL } from '@/lib/env';
import { createMyCoin } from '@/lib/zoraCoin';
import { createMetadataBuilder, createZoraUploaderForCreator, ValidMetadataURI } from '@zoralabs/coins-sdk';
import { getCastPngImage } from '../image/cast';
const ARSEEDING_WALLET_PRIVATE_KEY = process.env.ARSEEDING_WALLET_PRIVATE_KEY;
const ARSEED_URL = process.env.ARSEED_URL || 'https://arseed.web3infra.dev';
export default async function handler(req: any, res: any) {
    console.log('Zora hook request data:',req.body);
    const userAddress = req.body.data.author?.verified_addresses?.primary?.eth_address;
    const parentCastHash = req.body.data.parent_hash;
    const castHash = req.body.data.hash;
    console.log('Zora hook request userAddress:',userAddress);
    console.log('Zora hook request parentCastHash:',parentCastHash);
    console.log('Zora hook request castHash:',castHash);

    const castImageBuffer = await getCastPngImage(parentCastHash);
    const coin = await createMyCoin({
        name: parentCastHash.substring(0, 8),
        symbol: parentCastHash.substring(0, 8),
        uri: "" as ValidMetadataURI,
        payoutRecipient: userAddress??"0x474A491d6de25e868E45222fD2a8c6714d759e6F",
        platformReferrer: "0x474A491d6de25e868E45222fD2a8c6714d759e6F",
    }, castImageBuffer);

    // TODO
    res.setHeader("Content-Type", "application/json");
    res.send({coinAddress: coin.address});
}

async function getAr(castHash: string){
    const imageUrl = `${FRAMES_BASE_URL}/api/image/cast?hash=${castHash}`;

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });
    const data = Buffer.from(response.data, 'binary');
    const contentType = response.headers['content-type'];
    let tags = [{ name: "Content-Type", value: contentType }];
    const res = await sendAndPay(data, { tags });
    return res;
  }

async function sendAndPay(data: Buffer, options: DataItemCreateOptions) {
    if (!ARSEEDING_WALLET_PRIVATE_KEY) {
        console.error('ARSEEDING_WALLET_PRIVATE_KEY not found');
        return;
      }
      const arseedingInstance = genNodeAPI(ARSEEDING_WALLET_PRIVATE_KEY);
      // everPay 支持的 token tag (chainType-symbol-id) , 默认用: ethereum-eth-0x0000000000000000000000000000000000000000
      const payCurrencyTags = await getTokenTagByEver('eth');
      const payCurrencyTag = payCurrencyTags[0];
    const res = await arseedingInstance.sendAndPay(
      ARSEED_URL,
      data,
      payCurrencyTag,
      options,
    );
    const itemId = res.order.itemId;
    const arseedUrl = `${ARSEED_URL}/${itemId}`;
    const arUrl = `https://arweave.net/${itemId}`;
    return { arUrl, arseedUrl, ...res };
}