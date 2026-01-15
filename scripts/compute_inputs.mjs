// Compute test inputs for the private voting circuit
import { buildPoseidon } from "circomlibjs";

async function main() {
    const poseidon = await buildPoseidon();

    // Test values
    const secret = BigInt(12345);
    const proposal_id = BigInt(1);

    // Compute leaf = hash(secret, secret)
    const leaf = poseidon.F.toString(poseidon([secret, secret]));
    console.log("leaf =", leaf);

    // Compute nullifier = hash(secret, proposal_id)
    const nullifier = poseidon.F.toString(poseidon([secret, proposal_id]));
    console.log("nullifier =", nullifier);

    // Compute voters_root with all-zero siblings (single voter at leftmost)
    // This requires computing the merkle path
    let current = BigInt(leaf);
    const siblings = Array(20).fill(BigInt(0));
    const path_indices = Array(20).fill(0);

    for (let i = 0; i < 20; i++) {
        const sibling = siblings[i];
        const isRight = path_indices[i];

        let left, right;
        if (isRight === 0) {
            left = current;
            right = sibling;
        } else {
            left = sibling;
            right = current;
        }

        current = BigInt(poseidon.F.toString(poseidon([left, right])));
    }

    console.log("voters_root =", current.toString());

    // Print Prover.toml format
    console.log("\n--- Prover.toml values ---");
    console.log(`secret = "${secret}"`);
    console.log(`proposal_id = "${proposal_id}"`);
    console.log(`vote = "1"`);
    console.log(`nullifier = "${nullifier}"`);
    console.log(`voters_root = "${current.toString()}"`);
}

main().catch(console.error);
