# Elastos Light Wallet
[![Build/release](https://github.com/MButcho/elastos-light-wallet/actions/workflows/build.yml/badge.svg)](https://github.com/MButcho/elastos-light-wallet/actions/workflows/build.yml)

## Considerations!
- Elastos Light Wallet (ELW) is using special Elaphant API, which is no longer developed and implementing official Elastos API into ELW would require immense funding 
- I will try to maintain ELW until the end of **2023**, but I recommend following consideration:
  - If you are using **Ledger Nano S** with mainchain ELA, there is currently no alternate wallet, but you can send your ELA to **Essentials**, transfer to Elastos Smart Chain (ESC) and then send to your **ETH address** of your Ledger device on **Metamask**. That would give you Ledger security, but also sustainability for the future.
  - If are using just hot wallet in ELW (no Ledger device), create a new wallet in Essentials and move your funds there or import your existing mnemonic phrase to Essentials
- No new features will be implemented to Elastos Light Wallet so if you want to use following features: Staking/Voting, CR voting, Cross-chain transfers, please consider migrating to Essentials (https://elink.elastos.net/download)
- If you have any other question, feel free to join our [Discord](https://discord.gg/elastos) and tag me via @MButcho#1612

## Using Elastos Light Wallet

### If the ledger device cannot be detected, try adding the udev rules:
https://support.ledger.com/hc/en-us/articles/115005165269-Connection-issues-with-Windows-or-Linux

```
wget -q -O - https://raw.githubusercontent.com/LedgerHQ/udev-rules/master/add_udev_rules.sh | sudo bash
```

Any donation to ELA address EJfW2mCdZPVxHVEv891xDop7hJAsYbKH5R is much appreciated.

### Thank you and enjoy!