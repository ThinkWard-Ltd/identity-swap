import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Loadable } from "../../utils/types";
import * as WalletAPI from "../../api/wallet";
import { RootState } from "../../app/rootReducer";
import { addNotification } from "../notification/NotificationSlice";
import { Cluster } from "@solana/web3.js";

const DEFAULT_CLUSTER: Cluster = "devnet";

// The redux state relating to wallets
export interface WalletsState extends Loadable {
  cluster: Cluster;
  connected: boolean;
  publicKey: string | null;
}

// The initial wallet state. No wallet is connected yet.
const initialState: WalletsState = {
  cluster: DEFAULT_CLUSTER,
  connected: false,
  publicKey: null,
  loading: false,
  error: null,
};

/**
 * Async action to disconnect from a wallet.
 */
export const disconnect = createAsyncThunk(
  "wallet/disconnect",
  WalletAPI.disconnect
);

/**
 * Async action to connect to a wallet. Creates a new wallet instance,
 * connects to it, and connects action dispatchers, when a disconnect event
 * (e.g. the user closes the wallet tab) occurs.
 *
 * The output of the action is the user's public key in Base58 form,
 * so that the user can verify it.
 */
export const connect = createAsyncThunk(
  "wallet/connect",
  async (arg, thunkAPI): Promise<string> => {
    const {
      wallet: { cluster },
    }: RootState = thunkAPI.getState() as RootState;
    const wallet = await WalletAPI.connect(cluster);

    wallet.on("disconnect", () => {
      thunkAPI.dispatch(disconnect());
      thunkAPI.dispatch(addNotification({ message: "Wallet disconnected" }));
    });

    thunkAPI.dispatch(addNotification({ message: "Wallet connected" }));

    return wallet.pubkey.toBase58();
  }
);

/**
 * Redux slice containing the reducers for the wallet
 */
const walletSlice = createSlice({
  name: "wallet",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Triggered when the connect and disconnect async actions is in progress
    builder.addCase(connect.pending, (state) => ({
      ...state,
      loading: true,
    }));
    builder.addCase(disconnect.pending, (state) => ({
      ...state,
      loading: true,
    }));

    // Triggered when the connect async action is completed
    builder.addCase(connect.fulfilled, (state, action) => ({
      ...state,
      publicKey: action.payload,
      connected: true,
      loading: false,
    }));
    // Triggered when the disconnect async action is completed
    builder.addCase(disconnect.fulfilled, (state) => ({
      ...state,
      publicKey: null,
      connected: false,
      loading: false,
    }));
  },
});
export default walletSlice.reducer;
