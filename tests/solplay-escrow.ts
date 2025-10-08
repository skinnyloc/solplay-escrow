import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolplayEscrow } from "../target/types/solplay_escrow";

describe("solplay-escrow", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolplayEscrow as Program<SolplayEscrow>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
