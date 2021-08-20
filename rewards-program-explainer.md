# Charged Particles Rewards Program

## Purpose

The Charged Particles Rewards program serves two purposes:

1) Distribute more IONX tokens to community members to help the protocol further decentralize
2) Reward users for providing Liquidity to the IONX/ETH pool on Uniswap V2 or holding their IONX long-term

## How Estimated Rewards are Calculated

`Expected Rewards = (User Pool Balance * Epoch Multiplier) / Total Pool Balance`

**Variables:**
Expected Rewards = how much IONX a user can expect to earn  
User Pool Balance = user's balance of IONX or IONX/ETH in the staking pool
Total Pool Balance = all IONX or IONX/ETH in the staking pool
Epoch Multiplier = 

## APR Calculation

**DISCLAIMER:**
The stated APR (the 'Rate') is denominated in terms of $IONX, not USD or other fiat currency. The Rate is a forward-looking projection based on our good faith belief of how to reasonably project results over the relevant period, but such belief is subject to numerous assumptions, risks and uncertainties (including smart contract security risks and third-party actions) which could result in a materially different (lower or higher) token-denominated APY. The Rate is not a promise, guarantee or undertaking on the part of any person or group of persons, but depends entirely on the results of operation of smart contracts and other autonomous systems (including third-party systems) and how third parties interact with those systems after the time of your deposit. Even if the Rate is achieved as projected, you may still suffer a financial loss in fiat-denominated terms if the fiat-denominated value of the relevant tokens (your deposit and any tokens allocated or distributed to you pursuant to the Rate) declines during the deposit period.

**APR Formula:**
`(Total Rewards for Epoch * 52 weeks ) / Total Pool Balance`

*Assumptions:*
- Total Pool Balance = Total Pool Balance as of the last Ethereum block
- User deposits at the beginning of an epoch, and therefore has an epoch multiplier of 1
- User remains in the pool for the entire epoch


This video has a walkthrough of how APR is calculated for an identical rewards program: https://youtu.be/Maq-KxPv8W4?t=504
