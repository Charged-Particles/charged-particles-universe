# Charged Particles Rewards Program

## Overview

Charged Particles is currently offering IONX rewards to community members who provide liquidity to the official IONX/ETH Uniswap V2 pool and/or stake their IONX at rewards.charged.fi. The Charged Particles Rewards program serves two purposes:

1) Distribute more IONX tokens to community members to help the protocol further decentralize
2) Reward users for providing Liquidity to the IONX/ETH pool on Uniswap V2 or holding their IONX long-term

## V1 and V2 Timeline

- Each iteration of the IONX rewards program runs 12 weeks
- V1 ends Monday, August 30th at 22:43 UTC, and V2 begins directly afterwards
  - After V1 has ended users will still be able to withdraw and harvest from the V1 contract, but they will only be able to deposit funds into the V2 contract via rewards.charged.fi
- In order to continue earning rewards, users must withdraw their IONX from V1 and migrate them to V2 
## How to use rewards.charged.fi

**Staking IONX**
- Connect your wallet
- Click GET IONX button on UI to get IONX from Uniswap
  - IONX Address: 0x02D3A27Ac3f55d5D91Fb0f52759842696a864217
- Approve token
- Deposit IONX
  
**Staking IONX/ETH LP Tokens**
- Connect your wallet
 - Click Get IONX/ETH button on UI
  - Provide both IONX and ETH to the Uniswap L2 pool
  - Approve token
  - Deposit

**Harvesting**
 - After each epoch ends, users are able to harvest the IONX they earned for participating in the prior Epoch
 - Harvesting begins in Epoch 2
   - Epoch 2 of V2 begins Monday, September 6th at 21:43 UTC
  - If you want to compound your rewards, re-stake your harvested IONX

**Withdrawing**
- Click Withdraw on UI
- If you withdraw before the end of an epoch, you forfeit your rewards for the epoch
- You may withdraw after the end of an epoch and still earn rewards for it
  - e.g. if I stake for all of epoch 1, and withdraw in epoch 2, I will still get rewards for epoch 1, but I won't get any for epoch 2 once epoch 3 starts

## How Estimated Rewards are Calculated

`Expected Rewards = (User Pool Balance * Epoch Multiplier) / Total Pool Balance`

**Variables:**
Expected Rewards = how much IONX a user can expect to earn  
User Pool Balance = user's balance of IONX or IONX/ETH in the staking pool
Total Pool Balance = all IONX or IONX/ETH in the staking pool
Epoch Multiplier = Starts at 1 and progresses to 0 over the course of an epoch, making it so users who are in the epoch for longer get higher rewards than those who join towards the end

## Annual Percentage Return (APR)

**DISCLAIMER:**
The stated APR (the 'Rate') is denominated in terms of $IONX, not USD or other fiat currency. The Rate is a forward-looking projection based on our good faith belief of how to reasonably project results over the relevant period, but such belief is subject to numerous assumptions, risks and uncertainties (including smart contract security risks and third-party actions) which could result in a materially different (lower or higher) token-denominated APY. The Rate is not a promise, guarantee or undertaking on the part of any person or group of persons, but depends entirely on the results of operation of smart contracts and other autonomous systems (including third-party systems) and how third parties interact with those systems after the time of your deposit. Even if the Rate is achieved as projected, you may still suffer a financial loss in fiat-denominated terms if the fiat-denominated value of the relevant tokens (your deposit and any tokens allocated or distributed to you pursuant to the Rate) declines during the deposit period.

**APR Formula:**
`(Total Rewards for Epoch * 52 weeks ) / Total Pool Balance`

*Assumptions:*
- Total Pool Balance = Total Pool Balance as of the last Ethereum block
- User deposits at the beginning of an epoch, and therefore has an epoch multiplier of 1
- User remains in the pool for the entire epoch


This video has a walkthrough of how APR is calculated for an identical rewards program: https://youtu.be/Maq-KxPv8W4?t=504
