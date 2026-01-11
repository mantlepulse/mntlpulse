import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PollsContractModule = buildModule("PollsContractModule", (m) => {
  const pollsContract = m.contract("PollsContract");

  return { pollsContract };
});

export default PollsContractModule;