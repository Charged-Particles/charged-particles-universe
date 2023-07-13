const {
  log,
} = require('../js-helpers/utils');

const configProtocol = require('../js-helpers/configProtocol');

module.exports = async (hre) => {

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
  log('Charged Particles Protocol - Contract Configurations');
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n');

  await configProtocol(hre);

};

module.exports.tags = ['setup'];
