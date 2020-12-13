
module.exports = async ({
  contractInstance,
  contractMethod,
  contractCaller,
  contractParams = [],
  callValue = '0',
}) => {
  const returnValue = await contractInstance.connect(contractCaller).callStatic[contractMethod](
    ...contractParams,
    { value: callValue }
  );
  await contractInstance.connect(contractCaller)[contractMethod](
    ...contractParams,
    { value: callValue }
  );
  return returnValue;
};
