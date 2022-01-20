const {
  saveMigrationData,
  getMigrationData,
} = require('../js-helpers/deploy');

const {
  executeTx,
  getAccumulatedGasCost,
} = require('../js-helpers/executeTx');

const {
  log,
  chainIdByName,
} = require('../js-helpers/utils');

const { AddressZero } = require('ethers').constants
const _ = require('lodash');


const _migrationSubgraphDump = {
  chargedSettings: require('../migration_data/subgraph_dump/ChargedSettings'),
  chargedState: require('../migration_data/subgraph_dump/ChargedState'),
};


module.exports = async (hre) => {
  const network = await hre.network;
  const chainId = chainIdByName(network.name);

  // if (chainId !== 42) { return; } // Kovan only

  const migrationTracking = {
    accounts: getMigrationData('accounts', chainId),
    contracts: getMigrationData('contracts', chainId),
    nfts: getMigrationData('nfts', chainId),
  };
  const isMigrated = (typeId, dataId) => _.has(migrationTracking[typeId], dataId);


  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles Protocol - Contract Migrations');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  let nftCreatorData, annuityRedirect;
  const nftCreatorSettings = _.get(_migrationSubgraphDump, 'chargedSettings.nftCreatorSettings', []);
  log(`\n\n  Migrating ChargedSettings for ${nftCreatorSettings.length} Accounts...`);

  for (let i = 0; i < nftCreatorSettings.length; i++) {
    nftCreatorData = nftCreatorSettings[i];
    annuityRedirect = !_.isEmpty(nftCreatorData.annuityRedirect) ? nftCreatorData.annuityRedirect : AddressZero;

    if (isMigrated('accounts', nftCreatorData.id)) {
      log(`  - [TX-8-a-${i}] Skipping: ${nftCreatorData.id} (already migrated)`);
      continue;
    }

    await executeTx(`8-a-${i}`, `Migrating ChargedSettings for: ${nftCreatorData.id}`, async () =>
      await chargedSettings.migrateToken(
        nftCreatorData.contractAddress,
        nftCreatorData.tokenId,
        nftCreatorData.creatorAddress,
        nftCreatorData.annuityPercent,
        annuityRedirect,
      )
    );
    migrationTracking.accounts[nftCreatorData.id] = true;
    saveMigrationData(chainId, migrationTracking);
  }

  let nftEnabledData;
  const nftSettings = _.get(_migrationSubgraphDump, 'chargedSettings.nftSettings', []);
  log(`\n\n  Migrating ChargedSettings for ${nftSettings.length} Contracts...`);

  for (let i = 0; i < nftSettings.length; i++) {
    nftEnabledData = nftSettings[i];

    if (isMigrated('contracts', nftEnabledData.id)) {
      log(`  - [TX-8-b-${i}] Skipping: ${nftEnabledData.id} (already migrated)`);
      continue;
    }

    await executeTx(`8-b-${i}`, `Migrating ChargedSettings for: ${nftEnabledData.contractAddress}`, async () =>
      await chargedSettings.enableNftContracts([nftEnabledData.contractAddress])
    );
    migrationTracking.contracts[nftEnabledData.id] = true;
    saveMigrationData(chainId, migrationTracking);
  }

  let nftStateData, releaseTimelockExpiry, releaseTimelockLockedBy, tempLockExpiry;
  const nftState = _.get(_migrationSubgraphDump, 'chargedState', []);
  log(`\n\n  Migrating ChargedState for ${nftState.length} NFTs...`);

  for (let i = 0; i < nftState.length; i++) {
    nftStateData = nftState[i];
    releaseTimelockExpiry = !_.isEmpty(nftCreatorData.releaseTimelockExpiry) ? nftCreatorData.releaseTimelockExpiry : "0";
    releaseTimelockLockedBy = !_.isEmpty(nftCreatorData.releaseTimelockLockedBy) ? nftCreatorData.releaseTimelockLockedBy : AddressZero;
    tempLockExpiry = !_.isEmpty(nftCreatorData.tempLockExpiry) ? nftCreatorData.tempLockExpiry : "0";

    if (isMigrated('nfts', nftStateData.id)) {
      log(`  - [TX-8-c-${i}] Skipping: ${nftStateData.id} (already migrated)`);
      continue;
    }

    await executeTx(`8-c-${i}`, `Migrating ChargedState for: ${nftStateData.id}`, async () =>
      await chargedState.migrateToken(
        nftCreatorData.contractAddress,
        nftCreatorData.tokenId,
        releaseTimelockExpiry,
        releaseTimelockLockedBy,
        tempLockExpiry,
      )
    );
    migrationTracking.nfts[nftStateData.id] = true;
    saveMigrationData(chainId, migrationTracking);
  }


  log('\n  Contract Migration Complete.');
  const gasCosts = getAccumulatedGasCost();
  log('     - Total Gas Cost');
  log('       @ 10 gwei:  ', gasCosts[0]);
  log('       @ 100 gwei: ', gasCosts[1]);
  log('       @ 150 gwei: ', gasCosts[2]);
  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');
};

module.exports.tags = ['migrations']
