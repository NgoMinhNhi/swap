import { ethers } from 'ethers';
import routerAbi from './abi/router.json';
import erc20Abi from './abi/erc20.json';
import BigNumber from "bignumber.js";

const BIG_TEN = new BigNumber(10);


const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const INPUT_TOKEN_DECIMALS = process.env.INPUT_TOKEN_DECIMALS;
const PATH_ROUTE = JSON.parse(process.env.PATH_ROUTE);
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;
const GAS_LIMIT = process.env.GAS_LIMIT;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const account = wallet.connect(provider);

const contractToken = new ethers.Contract(
  PATH_ROUTE[0],
  erc20Abi,
  account
);

const getBalanceInput = async () => {
  try {
    const balance = await contractToken.balanceOf(PUBLIC_KEY);
    return new BigNumber(balance?._hex).dividedBy(BIG_TEN.pow(INPUT_TOKEN_DECIMALS)).toNumber();
  } catch (error) {
    console.log('Error in getBalance', error);
  }
}

const swapExactTokensForTokens = async (amountIn, path) => {
  try {
    console.log('swapExactTokensForTokens');
    amountIn = Math.floor(amountIn);
    const router = new ethers.Contract(
      ROUTER_ADDRESS,
      routerAbi,
      account
    );
    const nonce = await provider.getTransactionCount(PUBLIC_KEY);
    try {
      const tx = await router.swapExactTokensForTokens(
        new BigNumber(amountIn).times(BIG_TEN.pow(INPUT_TOKEN_DECIMALS)).toFixed(),
        new BigNumber(amountIn).times(BIG_TEN.pow(INPUT_TOKEN_DECIMALS)).toFixed(),
        path,
        PUBLIC_KEY,
        Math.round((Date.now() + 1000 * 60 * 10)/1000),
        {
          gasLimit: GAS_LIMIT,
          nonce: nonce || undefined,
        }
      )
      await tx.wait();
      console.log(tx.hash)
    } catch (error) {
      console.log(error)
    }
  } catch (error) {
    console.log('Error in swapExactTokensFroTokens', error);
  }
}

const loopSwap = async () => {
  try {
    while (true) {
      const inputBalance = await getBalanceInput();
      if (inputBalance < 1 || PATH_ROUTE?.length < 2 || PATH_ROUTE[0] !== PATH_ROUTE[PATH_ROUTE?.length - 1]) break;
      await swapExactTokensForTokens(inputBalance, PATH_ROUTE)
    }
  } catch (error) {
    console.log('Error in loopSwap', error);
  }
}

(async () => {
  console.log('Server Started');
  await loopSwap();
})()