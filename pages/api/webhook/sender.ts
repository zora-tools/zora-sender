import { createMyCoin } from '@/lib/zoraCoin';
import { ValidMetadataURI } from '@zoralabs/coins-sdk';
import { CastAddBody, CastType, createDefaultMetadataKeyInterceptor, EthersEip712Signer, getSSLHubRpcClient, NobleEd25519Signer } from '@farcaster/hub-nodejs';
import { makeCastAdd, Factories } from '@farcaster/hub-nodejs';
import { FarcasterNetwork, Eip712Signer } from '@farcaster/hub-nodejs';
import * as ed from '@noble/ed25519';
import { hexToBytes } from '@noble/hashes/utils';
import { getCastPngImage } from '../image/cast';
import { Wallet } from 'ethers';
// const ARSEEDING_WALLET_PRIVATE_KEY = process.env.ARSEEDING_WALLET_PRIVATE_KEY;
// const ARSEED_URL = process.env.ARSEED_URL || 'https://arseed.web3infra.dev';
export default async function handler(req: any, res: any) {
    console.log('Zora hook request data:',req.body);
    const userAddress = req.body.data.author?.verified_addresses?.primary?.eth_address;
    const parentCastHash = req.body.data.parent_hash;
    const castFid = req.body.data.author.fid;
    const castHash = req.body.data.hash;
    const text = req.body.data.text as string;

    if(!text.toLowerCase().replace(/\s/g, '').includes('sendit')){
       console.log('not sendit');
       return res.send('ok');
    }

    console.log('Zora hook request userAddress:',userAddress);
    console.log('Zora hook request parentCastHash:',parentCastHash);
    console.log('Zora hook request castHash:',castHash);
    console.log('Zora hook request castFid:',castFid);

  
    const castImageBuffer = await getCastPngImage(parentCastHash);
    const coin = await createMyCoin({
        name: parentCastHash.substring(0, 8),
        symbol: parentCastHash.substring(0, 8),
        uri: "" as ValidMetadataURI,
        payoutRecipient: userAddress??"0x474A491d6de25e868E45222fD2a8c6714d759e6F",
        platformReferrer: "0x474A491d6de25e868E45222fD2a8c6714d759e6F",
    }, castImageBuffer);

    // TODO
    // const replyRes = await replyToUser({
    //     fromFid: 1143804,
    //     castHash: '0x2967f6539aca4855760b6bfdf7a34b0fc69bfb84',
    //     replyContent: `Zora coin has been sent!`,
    //     zoraUrl: `https://zora.co/coin/base:0x80242Be65080976165cEdc00D888aE8c7eB605B3`,
    // });
    // console.log('replyRes:',replyRes);
    // res.setHeader("Content-Type", "application/json");
    // res.send({coinAddress: coin.address});

    res.setHeader("Content-Type", "application/json");
    res.send(coin.address);
}



// async function registerSigner() {
//     const hubClient = getSSLHubRpcClient(process.env.FARCASTER_BOT_RPC_URL as string, {
//         interceptors: [
//             createDefaultMetadataKeyInterceptor('x-api-key', process.env.NEYNAR_API_KEY as string)
//         ],
//         'grpc.max_receive_message_length': 20 * 1024 * 1024, 
//     });
//     // 你的 custody address 的私钥（用于签名 signer add）
//     const mnemonic = 'legal slow erase catalog eight make ritual flock glow item popular tag alone cram horror gap ability tired sunny task photo aspect bulk wear';
//     const wallet = Wallet.fromPhrase(mnemonic);
//     const custodySigner = new EthersEip712Signer(wallet);

//     // 你的 fid（确保这个 fid 是由该钱包控制的）
//     const fid = 1143804;

//     // 生成新的 Ed25519 signer（将用于发 cast）
//     const privateKey = ed.utils.randomPrivateKey(); // Applications must store this key securely.
//     console.log('privateKey:', Buffer.from(privateKey).toString('hex'));
//     const ed25519Signer = new NobleEd25519Signer(privateKey);

//     const signerAddMessage = await Factories.SignerAdd({
//         fid,
//         network: FarcasterNetwork.MAINNET,
//         signer: custodySigner,
//         key: ed25519Signer,
//         scheme: 1, // 1 = Ed25519
//     });

//     // // 使用 MessageFactory 构造 signerAdd message
//     // const factory = new Factories.Message({
//     //     fid,
//     //     network: FarcasterNetwork.MAINNET,
//     //     signer: custodySigner,
//     // });

//     // const signerAddMessage = await factory.buildSignerAdd({
//     //     key: ed25519Signer,
//     //     scheme: 1, // 1 = Ed25519
//     // });

//     // 提交到 hub
//     const result = await hubClient.submitMessage(signerAddMessage);
//     console.log(result.isOk() ? "✅ Signer 注册成功" : result.error);
// }

async function replyToCast() {
    const hubClient = getSSLHubRpcClient(process.env.FARCASTER_BOT_RPC_URL as string, {
        interceptors: [
            createDefaultMetadataKeyInterceptor('x-api-key', process.env.NEYNAR_API_KEY as string)
        ],
        'grpc.max_receive_message_length': 20 * 1024 * 1024, 
    });
    // 初始化 signer（你需要替换为自己的私钥）
    const signer = new NobleEd25519Signer(hexToBytes(process.env.FARCASTER_BOT_PRIVATE_KEY as string));

    const parentFid = 1143804; // 你要回复的Cast的作者FID
    const parentHash = Buffer.from("2967f6539aca4855760b6bfdf7a34b0fc69bfb84", "hex");
  
    const body: CastAddBody = {
      text: "👋",
      embeds: [], // 如果要嵌入链接或其他media，放这里
      mentions: [], // 如果你提到了其他fid
      parentCastId: {
        fid: parentFid,
        hash: new Uint8Array(parentHash),
      },
      mentionsPositions: [],
      type: CastType.CAST,
      embedsDeprecated: [],
    };
  
    const castAddMessage = await makeCastAdd(
        body,
        {
            fid: Number(process.env.FARCASTER_BOT_FID),
            network: FarcasterNetwork.MAINNET,
        },
        signer,  
    );
  
    const result = await hubClient.submitMessage(castAddMessage._unsafeUnwrap());
    console.log(result.isOk() ? "Cast 回复成功 🎉" : result.error);
  }
  

async function replyToUser({
    fromFid,
    castHash,
    replyContent,
    zoraUrl,
  }: {
    fromFid: number;
    castHash: string;
    replyContent: string;
    zoraUrl: string;
  }) {
    if (!process.env.FARCASTER_BOT_PRIVATE_KEY || !process.env.FARCASTER_BOT_FID) {
      return;
    }
    console.log('process.env.FARCASTER_BOT_PRIVATE_KEY :', process.env.FARCASTER_BOT_PRIVATE_KEY );
    console.log('process.env.FARCASTER_BOT_RPC_URL :', process.env.FARCASTER_BOT_RPC_URL );
    console.log('process.env.FARCASTER_BOT_FID :', process.env.FARCASTER_BOT_FID );
   
    const privateKeyBytes = hexToBytes(process.env.FARCASTER_BOT_PRIVATE_KEY);
    const ed25519Signer = new NobleEd25519Signer(privateKeyBytes);
    const client = getSSLHubRpcClient(process.env.FARCASTER_BOT_RPC_URL as string, {
        interceptors: [
            createDefaultMetadataKeyInterceptor('x-api-key', process.env.NEYNAR_API_KEY as string)
        ],
        'grpc.max_receive_message_length': 20 * 1024 * 1024, 
    });;

    console.log('fromFid:', fromFid);
    console.log('botFid:', process.env.FARCASTER_BOT_FID);
    
    const hash = Buffer.from(castHash.replace('0x', ''), 'hex');
    const comment = await makeCastAdd(
      {
          text: replyContent,
          embeds: [{url: zoraUrl}],
          embedsDeprecated: [],
          parentCastId: {
             hash: new Uint8Array(hash),
             fid: Number(fromFid),
          },
          mentions: [],
          mentionsPositions: [],
          type: CastType.CAST
      },
      {
        fid: Number(process.env.FARCASTER_BOT_FID),
        network: FarcasterNetwork.MAINNET,
      },
      ed25519Signer,
    );

    if (comment.isErr()) {
      throw new Error(comment.error.message);
    }

    const resp = await client.submitMessage(comment._unsafeUnwrap());
    if (resp.isErr()) {
      console.log(resp.error.message);
      throw new Error(resp.error.message);
    }
    return resp.value;
  }





// async function getAr(castHash: string){
//     const imageUrl = `${FRAMES_BASE_URL}/api/image/cast?hash=${castHash}`;

//     const response = await axios.get(imageUrl, {
//       responseType: 'arraybuffer',
//     });
//     const data = Buffer.from(response.data, 'binary');
//     const contentType = response.headers['content-type'];
//     let tags = [{ name: "Content-Type", value: contentType }];
//     const res = await sendAndPay(data, { tags });
//     return res;
//   }

// async function sendAndPay(data: Buffer, options: DataItemCreateOptions) {
//     if (!ARSEEDING_WALLET_PRIVATE_KEY) {
//         console.error('ARSEEDING_WALLET_PRIVATE_KEY not found');
//         return;
//       }
//       const arseedingInstance = genNodeAPI(ARSEEDING_WALLET_PRIVATE_KEY);
//       // everPay 支持的 token tag (chainType-symbol-id) , 默认用: ethereum-eth-0x0000000000000000000000000000000000000000
//       const payCurrencyTags = await getTokenTagByEver('eth');
//       const payCurrencyTag = payCurrencyTags[0];
//     const res = await arseedingInstance.sendAndPay(
//       ARSEED_URL,
//       data,
//       payCurrencyTag,
//       options,
//     );
//     const itemId = res.order.itemId;
//     const arseedUrl = `${ARSEED_URL}/${itemId}`;
//     const arUrl = `https://arweave.net/${itemId}`;
//     return { arUrl, arseedUrl, ...res };
// }