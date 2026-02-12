import { bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { getPublicKey } from "nostr-tools";
import { mnemonicToSeedSync } from "@scure/bip39";
import { SimplePool } from "nostr-tools/pool";
import { nip44 } from "nostr-tools";

const MINT_BACKUP_KIND = 30078;

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.8333.space/',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

// Derive Nostr keypair from mnemonic for mint backup
export async function deriveMintBackupKeys(mnemonic) {
  const seed = mnemonicToSeedSync(mnemonic);
  const domainSeparator = new TextEncoder().encode("cashu-mint-backup");
  const combinedData = new Uint8Array(seed.length + domainSeparator.length);
  combinedData.set(seed);
  combinedData.set(domainSeparator, seed.length);

  const privateKeyBytes = sha256(combinedData);
  const privateKeyHex = bytesToHex(privateKeyBytes);
  const publicKeyHex = getPublicKey(privateKeyBytes);

  return { privateKeyHex, publicKeyHex, privateKeyBytes };
}

// Search for mint backups on Nostr
export async function searchMintsOnNostr(mnemonic, relays = DEFAULT_RELAYS) {
  const pool = new SimplePool();

  try {
    const { privateKeyHex, publicKeyHex, privateKeyBytes } = await deriveMintBackupKeys(mnemonic);

    const filter = {
      kinds: [MINT_BACKUP_KIND],
      authors: [publicKeyHex],
      "#d": ["mint-list"],
      limit: 10,
    };

    // Use SimplePool.querySync like your nwcStore does
    const events = await pool.querySync(relays, filter);
    console.log(`Found ${events.length} mint backup events`);

    const allDiscoveredMints = [];

    for (const event of events) {
      try {
          const conversationKey = nip44.v2.utils.getConversationKey(
            privateKeyBytes,
            publicKeyHex
          );
        const decryptedContent = nip44.v2.decrypt(
          event.content,
          conversationKey
        );

        const backupData = JSON.parse(decryptedContent);

        for (const mintUrl of backupData.mints) {
          const existingMint = allDiscoveredMints.find((m) => m.url === mintUrl);
          if (!existingMint) {
            allDiscoveredMints.push({
              url: mintUrl,
              timestamp: backupData.timestamp,
              selected: false,
            });
          } else if (backupData.timestamp > existingMint.timestamp) {
            existingMint.timestamp = backupData.timestamp;
          }
        }
      } catch (decryptError) {
        console.error("Failed to decrypt backup event:", decryptError);
      }
    }

    allDiscoveredMints.sort((a, b) => b.timestamp - a.timestamp);
    return allDiscoveredMints;
  } catch (error) {
    console.error("Failed to search mints on Nostr:", error);
    throw error;
  } finally {
    pool.close(relays);
  }
}

// Backup mint list to Nostr
export async function backupMintsToNostr(mnemonic, mintUrls, relays = DEFAULT_RELAYS) {
  if (!mintUrls || mintUrls.length === 0) {
    console.log("No mints to backup");
    return null;
  }

  const pool = new SimplePool();

  try {
    const { privateKeyHex, publicKeyHex, privateKeyBytes } = await deriveMintBackupKeys(mnemonic);

    const backupData = {
      mints: mintUrls,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const conversationKey = nip44.v2.utils.getConversationKey(
      privateKeyBytes,
      publicKeyHex
    );
    const encryptedContent = nip44.v2.encrypt(
      JSON.stringify(backupData),
      conversationKey
    );

    const { finalizeEvent } = await import("nostr-tools");
    const event = finalizeEvent(
      {
        kind: MINT_BACKUP_KIND,
        content: encryptedContent,
        tags: [
          ["d", "mint-list"],
          ["client", "satoshi-pay"],
        ],
        created_at: backupData.timestamp,
      },
      privateKeyBytes
    );

    await pool.publish(relays, event);
    console.log("Mint backup published to Nostr:", event.id);
    return event.id;
  } catch (error) {
    console.error("Failed to backup mints to Nostr:", error);
    throw error;
  } finally {
    pool.close(relays);
  }
}
